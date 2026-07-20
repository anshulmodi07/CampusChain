# CampusChain: Comprehensive Technical Deep-Dive

This document serves as an exhaustive technical reference of the **CampusChain** crowdfunding architecture. It is designed to detail and defend every design decision, highlight structural tradeoffs, identify security boundaries, and map out scalability challenges.

---

## 1. System Architecture

CampusChain functions as a **"Web2.5" hybrid application**. It uses a standard web tier for user accounts, campaign metadata, and comments, while anchoring financial transaction proofs onto the Ethereum blockchain to guarantee data integrity.

### ASCII Component Architecture

```
                                  +-----------------------+
                                  |   Frontend Client     |
                                  |   (Netlify Static)    |
                                  +-------+-------+-------+
                                          |       |
                 Web3 / MetaMask (RPC)    |       |   HTTPS / REST
             +----------------------------+       +-------------------+
             |                                                        |
             v                                                        v
+------------+------------+                               +-----------+-----------+
|  Ethereum Sepolia Node  |                               |   Nginx Reverse Proxy |
|   (Alchemy RPC Endpoint)|                               |   (Port 80/443 on EC2)|
+------------+------------+                               +-----------+-----------+
             ^                                                        |
             |                                                        v
             |                                            +-----------+-----------+
             |            JSON-RPC / Wallet Signer        |   Express.js Backend  |
             +--------------------------------------------+   (Port 5000 via PM2) |
                                                          +-----------+-----------+
                                                                      |
                                                                      v
                                                          +-----------+-----------+
                                                          |  TiDB Cloud Database  |
                                                          |  (Serverless MySQL)   |
                                                          +-----------------------+
```

### Full Donation Request Flows

#### Flow A: MetaMask (ETH) Donation
1. **Frontend Click:** In [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js#L223-L288), the donor clicks the `donateEthBtn`.
2. **Web3 Call:** The browser script instantiates `Web3` using the window provider (`window.ethereum`) and sends an on-chain transaction calling `donate(fundraiserId)` on the crowdfunding smart contract deployed at `0x4bd64A1f096c7eaBbeC73886CDD9Fb8c672036dc` (configured in [contractConfig.js](file:///d:/CampusChain/frontend/contractConfig.js#L2)).
3. **RPC Broadcast:** MetaMask broadcasts the transaction to the Ethereum Sepolia testnet. The transaction transfers native ETH directly to the campaign organizer's wallet address.
4. **Mined Transaction:** The client-side promise resolves once the transaction is mined, returning the on-chain receipt including the `transactionHash`.
5. **Backend Record:** The client invokes `POST /api/donate` (handled by [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L7-L76)) passing the `fundraiser_id`, `amount`, and `tx_hash`.
6. **DB Insert:** The controller calls `recordDonation()` in [donation.service.js](file:///d:/CampusChain/backend/services/donation.service.js#L6-L45) to execute a SQL `INSERT` statement in the `donations` table.
7. **Proof Generation & Anchoring:** The backend calls `generateDonationHash()` in [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L92-L157) using the new row's ID, amount, and timestamp, then calls `anchorDonation()` to commit the Keccak256 hash onto the `DonationProofRegistry` contract.
8. **Confirmation:** Once the proof anchoring transaction is mined, the backend executes an `UPDATE` SQL query storing the `anchor_tx_hash` on the database record and returns a HTTP 200 response to the client.

#### Flow B: Razorpay (INR) Donation
1. **Frontend Order Initialization:** The donor inputs an INR amount and clicks `donateRazorpayBtn` in [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js#L320-L435). The script calls `POST /api/razorpay/create-order` to request a backend order.
2. **Razorpay SDK Order Request:** The backend controller ([payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L165-L214)) processes this request. It scales the amount to paise (amount * 100), calls the Razorpay API node dependency, generates a unique receipt string, and returns the Razorpay `order_id` to the client.
3. **Modal Checkout:** The frontend receives the order configuration and loads the Razorpay checkout overlay using `checkout.js`.
4. **Gateway Processing:** The donor completes the payment in the Razorpay iframe (using test mode mock instruments). On completion, Razorpay returns a response object containing `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5. **Backend Verification:** The frontend script submits these elements to `POST /api/razorpay/verify` (handled in [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L58-L163)).
6. **Signature Verification:** The backend re-computes the HMAC-SHA256 hash using its local `RAZORPAY_KEY_SECRET` and asserts it matches the client-supplied signature.
7. **Idempotency Check:** The database is queried for any existing `payment_reference` matching the `razorpay_payment_id` to block duplicate processing.
8. **DB Insert & Anchoring:** Upon signature match, `recordDonation()` inserts the record, `generateDonationHash()` derives the cryptographic hash, and `anchorDonation()` commits it to the Sepolia-based `DonationProofRegistry` contract.
9. **Final Update:** The database record is updated with the `anchor_tx_hash`, and a status verification response is sent to the client.

---

## 2. Smart Contract Design

CampusChain utilizes a split-contract design, isolating on-chain payment logic from data integrity proofs.

```
+------------------------------------+      +------------------------------------+
|     CampusChainCrowdfunding        |      |       DonationProofRegistry        |
|  - Handles active ETH escrows      |      |  - Cryptographic trust anchor      |
|  - Users pay directly with wallets |      |  - Stores hashes of all donations  |
|  - Organizers receive ETH directly |      |  - Anchored by backend system key  |
+------------------------------------+      +------------------------------------+
```

### A. Contract: `CampusChainCrowdfunding` ([contract.sol](file:///d:/CampusChain/contract.sol))
This contract manages the logic for on-chain crowdfunding.

#### Public State Variables:
* `fundraiserCount` (uint256): Total number of fundraisers created.
* `fundraisers` (mapping uint256 => Fundraiser): Mapping containing campaign structures (id, owner address, title, description, goal, raised, active status).
* `donations` (mapping uint256 => Donation[]): List of donations made on-chain per fundraiser ID.

#### External Functions:
* `createFundraiser(string _title, string _description, uint256 _goal)`: Initializes a new Fundraiser struct in the mapping and emits `FundraiserCreated`.
* `donate(uint256 _fundraiserId) external payable`: Accepts native ETH, increases the fundraiser's `raised` counter, pushes a `Donation` struct to storage, forwards the received ether to the fundraiser owner using `fundraiser.owner.transfer(msg.value)`, and automatically toggles `active = false` if the target goal is met.
* `closeFundraiser(uint256 _fundraiserId)`: Toggles active status of a fundraiser to false. Enforces ownership check.
* `getDonations(uint256 _fundraiserId) external view returns (Donation[] memory)`: Returns the array of on-chain donations for an individual campaign.
* `getFundraiser(uint256 _fundraiserId) external view`: Returns structural fields of a single fundraiser.

### B. Contract: `DonationProofRegistry` ([DonationProofRegistry.sol](file:///d:/CampusChain/DonationProofRegistry.sol))
This contract acts as the platform's cryptographic trust anchor, recording tamper-proof verification details of off-chain transactions.

#### State Variables:
* `proofs` (mapping bytes32 => Proof): Maps a Keccak256 hash to a `Proof` struct containing `timestamp` and the anchor address `anchoredBy`.

#### External Functions:
* `anchorDonation(bytes32 donationHash) external`: Writes the proof structure into storage if the hash is valid and has not been anchored before. Emits `DonationAnchored`.
* `verifyDonation(bytes32 donationHash) external view returns (bool)`: Read-only function returning whether the proof hash exists.
* `getProof(bytes32 donationHash) external view returns (uint256, address)`: Returns the block timestamp and the transaction caller that anchored the hash.

### C. Design Rationale & Gas Implications of the Split
* **Architectural Separation:** Splitting the contracts separates financial operations from integrity proofs. This separation is required because Razorpay payments happen entirely off-chain (in local fiat currency). The fiat payments cannot flow through the `CampusChainCrowdfunding` contract. Isolating the proof logging logic in `DonationProofRegistry` allows both on-chain and off-chain donations to register a cryptographic audit trail using the same schema.
* **Gas Considerations:** Calling `anchorDonation()` writes a new key-value pair to storage mapping (`SSTORE`). Writing to mapping from zero to non-zero values incurs a gas cost of 20,000 gas. Keeping this registry lightweight (only a mapping of `bytes32 => Proof`) keeps execution fees low. It avoids storing complex, variable-length text strings or nested arrays on the proof registry contract, which would significantly increase gas costs.

### D. Access Control Enforcement
* **On-Chain Enforcement:**
  - In `CampusChainCrowdfunding.sol`, the modifier `onlyOwner(uint256 _id)` (line 65) enforces that `msg.sender == fundraisers[_id].owner` before allowing manual campaign closure via `closeFundraiser()`.
  - In `DonationProofRegistry.sol`, anyone can theoretically call `anchorDonation(bytes32)`. However, the contract permanently saves the caller in `proofs[donationHash].anchoredBy`. The backend checks that the `anchoredBy` address matches the known public key of the platform (`PROOF_REGISTRY_ADDRESS` / `ANCHOR_PRIVATE_KEY`) to confirm authenticity.
* **Off-Chain Enforcement:**
  - Route authorization is enforced by Express middlewares `verifyToken` and `requireRole` in [auth.middleware.js](file:///d:/CampusChain/backend/middlewares/auth.middleware.js). The roles `'donor'` and `'ngo'` are evaluated before routing requests to controllers.

### E. Smart Contract Limitations and Attack Surface
1. **Reentrancy Risk:** In `CampusChainCrowdfunding.sol` (line 130), `fundraiser.owner.transfer(msg.value)` is executed before updating the active status of the campaign or closing it. However, the contract uses `.transfer()`, which is limited to forwarding a fixed stipend of `2300` gas. This makes state modifications or nested reentrant calls by receiver contracts impossible, mitigating reentrancy attacks.
   * *Tradeoff:* The use of `.transfer()` is a modern Solidity anti-pattern. If a fundraiser owner is a smart contract (e.g. multi-sig wallet, DAO) instead of an Externally Owned Account (EOA), its `fallback()` or `receive()` function may require more than 2300 gas to run, causing the transaction to fail and preventing the owner from receiving donations.
2. **Upgradeability:** Neither contract is upgradeable (they lack proxy logic, ERC-1967 pattern, or delegatecall mappings). If a critical bug is discovered, the contracts must be abandoned, and users must migrate to a new contract deployed to a new address.
3. **No Pausable Control:** There is no emergency stop circuit breaker. Under an exploit scenario, there is no admin function to pause operations.

---

## 3. Security Architecture

### A. Authentication & Role-Based Access Control (RBAC)
* **Token Issuance:** Handled in [auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js#L58-L96). On successful credentials match, the server generates a JWT containing `{ id, role, wallet }` signed with a server-side `JWT_SECRET`. It is configured to expire in `1 day`.
* **Refresh/Expiry:** No refresh token flow is implemented. Upon token expiry, the client is forced to request a new session by logging in again.
* **Client-Side Storage:** The frontend client stores the token in `localStorage`.
* **RBAC Route Enforcement:** Express routes apply role checks. For instance, [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L13) restricts donation recording to `'donor'` role using `requireRole("donor")`.

### B. Cryptographic Proof & Forgery Detection
The backend is responsible for creating donation proof hashes using `generateDonationHash()` in [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L92-L157).

#### Calculation Parameters:
The Keccak256 hash is generated by encoding the following fields in order:
1. `donationId` (uint256)
2. `fundraiser_id` (uint256)
3. `donor_address` (address)
4. `amount` (uint256 - represented deterministically to avoid floating-point rounding errors)
5. `payment_method` (string)
6. `payment_reference` (string)
7. `donatedAt` (uint256 - unix timestamp in seconds)

#### Integrity Bounds:
* **Detection of Forged Database Records:** If an attacker compromises the SQL database and edits a donation record (e.g., changes the amount from 10 INR to 1000 INR), the computed hash will mismatch the hash recorded on the blockchain. When the verification endpoint is loaded (`GET /api/donation/:donationId/verify`), the recalculation will fail to match the registry contract, reporting a validation error.
* **Backend Omission Vulnerability:** The backend handles the blockchain write transaction inside a `try...catch` block. If the RPC write fails, the database entry is kept but the `anchor_tx_hash` remains `NULL`. A compromised or malicious backend could skip the anchoring step entirely while returning a success state, leaving the record unprovable on-chain.

### C. Double-Spending & Replay Protections
* **MetaMask Payments:** The `donate` controller check in [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L22-L33) queries the database for any matching `tx_hash` before writing a record. Duplicate transaction hash submissions return a `409 Conflict`.
* **Razorpay Payments:** In [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L103-L113), the controller queries the database for duplicate `payment_reference` values before inserting. If the transaction has been recorded, it rejects the request with a `409 Conflict`.
* **On-Chain Registry Replay:** The `DonationProofRegistry` contract explicitly blocks double anchoring of the same hash:
  `require(proofs[donationHash].timestamp == 0, "Donation already anchored");`

### D. Server Infrastructure Hardening
* **Nginx Configuration:** The active Nginx configuration `/etc/nginx/sites-available/default` proxies traffic on port `443` and handles SSL termination using certificates generated by Let's Encrypt Certbot.
* **Input Validation:** Input parameters are checked manually in the controllers (e.g., `parsedAmount <= 0`, `parsedFundraiserId <= 0`). There are no rate-limiting middlewares (such as `express-rate-limit`) or input sanitation libraries (such as `express-validator` or `helmet`) installed.

---

## 4. Payment Rails Implementation Details

### A. ETH Donation Flow (MetaMask)

```
[Connect MetaMask] --> [Call contract.donate()] --> [Wait for Block Confirmation] --> [POST /api/donate] --> [DB Write] --> [Anchor Hash] --> [Update DB with Anchor Tx]
```

* **Frontend Action:** Connects provider, instantiates contract instance, and executes:
  `contract.methods.donate(fundraiserId).send({ from: userAccount, value: toWei(amount) })`
* **On Failure:**
  - *User Rejection:* The browser web3 provider throws a rejection error, updating the frontend message banner and releasing the payment UI. No backend call is triggered.
  - *Out of Gas / Revert:* The transaction fails on-chain, consuming partial gas fees. The client throws an exception, and no backend record is created.
  - *Backend API failure after successful transfer:* The donation succeeds on the blockchain, but the DB record is not created. This requires manual audit intervention to verify the Etherscan hash and manually insert the DB record.

### B. Razorpay Donation Flow

```
[POST /api/razorpay/create-order] --> [Open Razorpay Checkout Modal] --> [User Pays (Bank/Card)] --> [POST /api/razorpay/verify] --> [DB Write] --> [Anchor Hash] --> [Update DB]
```

* **Order Creation:** Request to `/api/razorpay/create-order` calls `razorpay.orders.create()` returning a valid order structure to the frontend client.
* **Verification Response:** The frontend callback passes `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to `/api/razorpay/verify`.
* **On Failure:**
  - *Order Creation Failure:* Returns a `500 Internal Server Error` to the client. No modal is displayed.
  - *Modal Dismissal:* Razorpay invokes the `ondismiss` handler, enabling the payment buttons to allow retry.
  - *Post-Payment Network Interruption:* If the client pays successfully but closes the browser before the verification request completes, the payment is captured in Razorpay but the database is never updated and the proof is not anchored.
    - *Production Recommendation:* Replace client-side signature callback verification with a server-side **Razorpay Webhook** endpoint to process asynchronous notifications securely.

---

## 5. Database Design

CampusChain utilizes **TiDB Cloud** (Serverless MySQL) as its data storage and aggregation engine.

### A. Database Schema Layout

#### Table: `users`
* `id` (INT, PK, Auto Increment)
* `name` (VARCHAR(150), Not Null)
* `email` (VARCHAR(255), Not Null, Unique Index)
* `password_hash` (VARCHAR(255), Not Null)
* `role` (ENUM('donor', 'ngo'), Not Null)
* `wallet_address` (VARCHAR(42), Nullable)
* `created_at` (TIMESTAMP, Default Current)

#### Table: `fundraisers`
* `fundraiser_id` (BIGINT, PK, Auto Increment)
* `title` (VARCHAR(255), Not Null)
* `description` (TEXT, Nullable)
* `goal` (DECIMAL(30,18), Default 0)
* `owner_wallet` (VARCHAR(42), Not Null)
* `fundraiser_type` (ENUM('public', 'private'), Default 'public')
* `category` (VARCHAR(100), Nullable)
* `people_affected` (INT, Default 0)
* `created_at` (TIMESTAMP, Default Current)

#### Table: `donations`
* `donation_id` (INT, PK, Auto Increment)
* `fundraiser_id` (BIGINT, FK referencing `fundraisers.fundraiser_id`)
* `donor_address` (VARCHAR(42), Not Null)
* `amount` (DECIMAL(30,18), Not Null)
* `tx_hash` (VARCHAR(100), Unique Index)
* `payment_method` (VARCHAR(50), Default 'crypto')
* `payment_reference` (VARCHAR(200), Nullable, Unique Index)
* `donated_at` (TIMESTAMP, Default Current)
* `anchor_tx_hash` (VARCHAR(100), Nullable)
* `currency` (VARCHAR(10), Default 'ETH')

#### Table: `comments`
* `comment_id` (INT, PK, Auto Increment)
* `fundraiser_id` (BIGINT, FK referencing `fundraisers.fundraiser_id` with Cascade Delete)
* `user_id` (INT, FK referencing `users.id` with Cascade Delete)
* `comment_text` (TEXT, Not Null)
* `created_at` (TIMESTAMP, Default Current)

### B. Scalability Rationale: TiDB vs Vanilla MySQL
* **Tradeoff / Gap:** Choosing TiDB Cloud Serverless for a college-scale deployment was a learning choice to gain experience with distributed SQL platforms, rather than a hard scaling requirement. A standard PostgreSQL or vanilla MySQL instance would have easily handled the application's write load.
* **TiDB Advantages:** If scaled, TiDB's distributed architecture automatically handles scale-out scenarios, separating computing layers from storage engines (TiKV) without manual database sharding or replication lag issues.

---

## 6. Scalability & System Design (HLD vs LLD)

### A. Current Single Points of Failure (SPOF)
1. **Single EC2 Backend Instance:** The Express application runs on a single AWS EC2 instance without auto-scaling or failover configurations.
2. **Sequential Blockchain Write Lock:** The backend wallet (`ANCHOR_PRIVATE_KEY`) can only handle one transaction write at a time per block. In a high-throughput scenario, transactions will fail with nonce-collision errors (e.g., `nonce too low`).
3. **Third-Party RPC Endpoints:** The connection to the Sepolia node depends on a single Alchemy endpoint. If rate-limited, the anchoring process halts.

### B. High-Volume Bottlenecks
* **Express Connection Limits:** Under heavy concurrent traffic, the Node process will run out of event loop cycles, delaying health check responses.
* **DB Pool Saturation:** The connection pool configured in [db/index.js](file:///d:/CampusChain/backend/db/index.js#L15-L34) has a limit of 10 concurrent connections. If 1,000 users query the campaign endpoint concurrently, queries will queue up, causing response times to spike.

### C. Proposed High-Throughput Redesign (100K Concurrent Users)

```
                            [ 100K Users ]
                                  |
                                  v
                       [ AWS Route 53 DNS ]
                                  |
                                  v
                     [ Application Load Balancer ]
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
    [ EC2 Auto-Scaling ]                        [ EC2 Auto-Scaling ]
    [ Express Backend ]                         [ Express Backend ]
            |                                           |
            +---------------------+---------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
   [ Redis Cache Layer ]                       [ TiDB Cloud Cluster ]
   (Sessions/Fundraiser Cards)                 (Transactional DB Storage)
                                                        |
                                                        v
                                             [ Redis/BullMQ Queue ]
                                             (Anchoring Jobs Enqueued)
                                                        |
                                                        v
                                            [ Decentralized Worker Pool ]
                                            (Rotates keys to avoid nonce
                                             collisions; submits to Multiple RPCs)
                                                        |
                                                        v
                                            [ Ethereum Blockchain ]
```

1. **Load Balancing & Auto-Scaling:** Deploy a stateless Express backend cluster behind an AWS Application Load Balancer (ALB) across multiple Availability Zones.
2. **Caching Strategy:** Place a Redis cache cluster between backend nodes and TiDB. Cache common queries (e.g., card counts and comments) with TTL invalidation to prevent database pool exhaustion.
3. **Queue-Based Blockchain Writes:** Decouple database writes from blockchain writes. When a donation is written to the database, place the hash in a Redis queue (using a library like `BullMQ`). A cluster of worker nodes can read from the queue, rotate through multiple funding keys to avoid nonce collisions, and batch-submit hashes to the proof registry contract.

---

## 7. Deployment & Infrastructure

* **Frontend Hosting:** Deployed on Netlify with continuous deployment. On git pushes to the main branch, Netlify automatically builds and hosts the static frontend assets from the `frontend/` folder.
* **Backend Hosting:** Deployed on an AWS EC2 instance. Process management is handled via **PM2**, which automatically restarts the process if it crashes.
* **Nginx Configuration:** Functions as a reverse proxy, forwarding requests on port `80`/`443` to the Express app running locally on `localhost:5000`.
* **CD Mechanics:** Currently manual. Deployments require ssh-ing into the instance, running `git pull`, installing dependencies, and executing `pm2 restart campuschain`.
* **Zero-Downtime:** There is no zero-downtime deployment mechanism (like blue-green deployments or PM2 reload). A PM2 restart drops connections for a brief window (approximately 1-2 seconds) during startup.

---

## 8. Blockchain-Specific Details

### A. Network Choice: Sepolia Testnet
* **Tradeoff:** Sepolia was chosen for development and verification purposes. Deploying onto Ethereum Mainnet is cost-prohibitive for student-run applications.
* **Production Recommendation:** If deployed, the project should target an **EVM-compatible Layer 2** (such as Arbitrum, Polygon, or Optimism) to ensure transaction gas costs remain under a fraction of a cent per anchor operation.

### B. Transaction Lifecycle with Ethers.js
When `anchorDonation` is invoked in [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L176-L203):
1. **Creation:** Ethers serializes the transaction parameters (to, data, value, nonce, gasLimit) and generates the RLP-encoded payload.
2. **Signing:** Ethers signs the payload locally using the `ANCHOR_PRIVATE_KEY`.
3. **Broadcast:** The signed transaction is sent via JSON-RPC to the Alchemy provider endpoint (`eth_sendRawTransaction`).
4. **Mined & Confirmed:** The script executes `await tx.wait()`. This polls the node until the transaction is mined into a block. The promise returns a `Receipt` object confirming the block number.

---

## 9. Gaps & Technical Tradeoffs

1. **No Backend Signature Verification for MetaMask Payments:** The backend trusts the `tx_hash` submitted by the client-side fetch payload. It checks for duplicates in the DB but does not verify the transaction details (from, value, to) on-chain using an RPC read before recording. An attacker could exploit this by submitting an unrelated Sepolia transaction hash to credit themselves with a fake donation in the SQL database.
2. **No Real-Time Event Sync / Indexer:** The backend does not run an event listener (like The Graph or a custom indexer) to sync smart contract logs. If a user donates ETH via MetaMask but their browser tab crashes before posting to the backend, the donation database record will never be written.
3. **No Webhooks for Razorpay:** The verification relies on the client-side modal callback. If a donor pays successfully but exits the tab before the redirection script triggers the `/api/razorpay/verify` call, the transaction will not be recorded in the system.
4. **Client-Side Secrets Vulnerability:** The frontend uses global variables (`window.CONTRACT_ABI` and `window.CONTRACT_ADDRESS`) stored in plain text files. While normal for Web3 client applications, this design relies on the backend to enforce authorization checks.

---
