# CampusChain Backend Implementation Deep-Dive
*Prepared by Senior Software Architect*

This manual provides an exact, code-derived implementation deep-dive for the **CampusChain** project. Every assertion is backed by file paths, function definitions, and actual snippets from the codebase. No speculative assumptions are made.

---

## SECTION 1 — COMPLETE FUNDRAISER CREATION FLOW

This section traces the complete sequence of events from when an NGO click-triggers a campaign launch until the campaign appears on the main homepage.

```text
User/NGO (Browser)       create-fundraiser.js        MetaMask Wallet       CampusChainCrowdfunding       Express REST API (EC2)        TiDB Cloud DB
       |                           |                       |                        |                         |                         |
       |--- Launch Campaign ------>|                       |                        |                         |                         |
       |                           |-- methods.create... ->|                        |                         |                         |
       |                           |   send({from: account})|                        |                         |                         |
       |                           |                       |-- send transaction --->|                         |                         |
       |                           |                       |   (Miner processes)    |                         |                         |
       |                           |<-- return receipt ----+------------------------|                         |                         |
       |                           |                                                                          |                         |
       |                           |-- POST /api/fundraiser/create ------------------------------------------>|                         |
       |                           |   (Payload: title, goal, category, description, type)                    |                         |
       |                           |                                                                          |-- verifyToken & Role -->|
       |                           |                                                                          |-- INSERT INTO DB ------>|
       |                           |                                                                          |<-- Return insertId -----|
       |                           |<-- Return success JSON --------------------------------------------------|                         |
       |                           |                                                                                                    |
       |                           +-- Redirects to ngo-dashboard.html                                                                  |
       |                                                                                                                                |
       |--- load homepage (index.html) ------------------------------------------------------------------------------------------------>|
       |                                                                                                                                |
       |--- GET /api/fundraisers -------------------------------------------------------------------------------------------->|         |
       |                                                                                                                              |-- SELECT JOIN query --->|
       |                                                                                                                              |<-- Return aggregated ---|
       |<-- Return campaigns JSON array ----------------------------------------------------------------------------------------------|
```

### Trace Answers

1.  **Frontend file handling submit**:
    *   *File:* [create-fundraiser.js](file:///d:/CampusChain/frontend/create-fundraiser.js) (Line 59).
    *   *Code:*
        ```javascript
        document.getElementById("fundraiserForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          await createFundraiser();
        });
        ```
2.  **Function running first**:
    *   *File:* [create-fundraiser.js](file:///d:/CampusChain/frontend/create-fundraiser.js) (Line 65).
    *   *Function Name:* `createFundraiser()`
3.  **When MetaMask is invoked**:
    *   *File:* [create-fundraiser.js](file:///d:/CampusChain/frontend/create-fundraiser.js) (Line 96).
    *   *Explanation:* Invoked inside the `createFundraiser` function, immediately after disabling the submit button and setting the message.
4.  **Contract function called**:
    *   *File:* [contractConfig.js](file:///d:/CampusChain/frontend/contractConfig.js#L51) & [create-fundraiser.js](file:///d:/CampusChain/frontend/create-fundraiser.js#L96).
    *   *Function Called:* `createFundraiser(string _name, string _description, string _fundraiserType, string _category, uint256 _peopleAffected)` on the `CampusChainCrowdfunding` contract.
5.  **Parameters sent**:
    *   *Title* (string), *Description* (string), *Type* (string, e.g., `'public'`), *Category* (string), *People* (uint256, coerced from form string), and transaction options `{ from: userAccount }`.
6.  **MetaMask Execution order**:
    *   MetaMask transaction executes **BEFORE** the backend API is invoked (Line 96 executes before the `fetch` statement on Line 109).
7.  **Backend API block**:
    *   Yes. The fetch request is blocked by the `await` keyword on the contract transaction execution, meaning it is only invoked after the block is mined and returned.
8.  **User MetaMask rejection**:
    *   If the user rejects the transaction, MetaMask throws an error. The code falls into the `catch (err)` block on Line 138, re-enables the submit button, displays `"Transaction failed"`, and the backend API fetch call is **never** executed.
9.  **Blockchain transaction failure**:
    *   If the gas runs out or the execution reverts on-chain, Web3.js throws an error, falling into the `catch (err)` block, and the backend API fetch call is **never** executed.
10. **SQL insertion on failure**:
    *   No. If either step 8 or step 9 occurs, the backend request is skipped, so SQL insertion does not happen.
11. **Transaction Hash stored**:
    *   No. The POST body payload sent to `/api/fundraiser/create` (Lines 115–122) contains `title`, `description`, `goal`, `category`, `people_affected`, and `fundraiser_type`, but **omits** the blockchain `transactionHash`. The transaction hash is not saved in the database for the campaign.
12. **Fundraiser Contract Address stored**:
    *   No. The backend database schema has no column for contract address. The application uses a single global contract address configured on the client.
13. **Blockchain fundraiser ID stored**:
    *   No. The database uses an auto-incrementing key `fundraiser_id` generated by SQL, and does not record the count index of the contract array.
14. **Smart Contract Response**:
    *   Returns a transaction receipt object containing `transactionHash`, `blockNumber`, `cumulativeGasUsed`, and logs matching the emitted `FundraiserCreated` event.
15. **SQL database record**:
    *   Inserts a new row in the `fundraisers` table.
    *   *Query location:* [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L72-L75) (`createFundraiser` function):
        ```sql
        INSERT INTO fundraisers (title, description, goal, owner_wallet, fundraiser_type, category, people_affected) VALUES (?, ?, ?, ?, ?, ?, ?)
        ```

---

## SECTION 2 — SMART CONTRACT ANALYSIS

This section analyzes the Solidity contracts: [contract.sol](file:///d:/CampusChain/contract.sol) (`CampusChainCrowdfunding`) and [DonationProofRegistry.sol](file:///d:/CampusChain/DonationProofRegistry.sol) (`DonationProofRegistry`).

### 1. `CampusChainCrowdfunding` Structural Analysis

#### State Variables
*   `fundraiserCount` (uint256, Line 33): Holds the total count of created fundraisers.
*   `fundraisers` (mapping, Line 36): Maps uint256 IDs to `Fundraiser` structs.
*   `donations` (mapping, Line 39): Maps uint256 fundraiser IDs to lists of `Donation` structs.

#### Structs
*   `Fundraiser` (Line 15):
    ```solidity
    struct Fundraiser {
        uint256 id;
        address payable owner;
        string title;
        string description;
        uint256 goal;
        uint256 raised;
        bool active;
    }
    ```
*   `Donation` (Line 25):
    ```solidity
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }
    ```

#### Mappings
*   `fundraisers` (Line 36): Maps `uint256 => Fundraiser`.
*   `donations` (Line 39): Maps `uint256 => Donation[]`.

#### Events
*   `FundraiserCreated` (Line 43): Emitted when a fundraiser is launched.
*   `DonationMade` (Line 50): Emitted when user sends ETH.
*   `FundraiserClosed` (Line 56): Emitted when closed.

#### Modifiers
*   `fundraiserExists(uint256 _id)` (Line 60):
    ```solidity
    modifier fundraiserExists(uint256 _id) {
        require(_id < fundraiserCount, "Fundraiser does not exist");
        _;
    }
    ```
*   `onlyOwner(uint256 _id)` (Line 65):
    ```solidity
    modifier onlyOwner(uint256 _id) {
        require(msg.sender == fundraisers[_id].owner, "Not fundraiser owner");
        _;
    }
    ```

#### Public Functions
*   Automatic getters generated for public state variables: `fundraiserCount`, `fundraisers`, `donations`.

#### External Functions
*   `createFundraiser(string calldata _title, string calldata _description, uint256 _goal)` (Line 78): Registers a fundraiser on-chain.
*   `donate(uint256 _fundraiserId)` (Line 109): Receives ETH, increments raised amount, writes to `donations` list, transfers value to campaign owner, and checks goal status.
*   `getDonations(uint256 _fundraiserId)` (Line 144): Returns all donations for a fundraiser.
*   `closeFundraiser(uint256 _fundraiserId)` (Line 156): Closes a fundraiser (restricted to the campaign owner).
*   `getFundraiser(uint256 _fundraiserId)` (Line 168): Returns details of a single fundraiser.

#### Internal Functions
*   *None implemented in the current codebase.*

#### Constructor
*   *None implemented (Default constructor).*

#### Storage Layout
1.  **Slot 0**: `fundraiserCount` (uint256, 32 bytes).
2.  **Slot 1**: `fundraisers` mapping (stores location of values based on slot index and keys).
3.  **Slot 2**: `donations` mapping.

---

### `createFundraiser` Line-by-Line Execution

```solidity
function createFundraiser(
    string calldata _title,
    string calldata _description,
    uint256 _goal
) external {
    // 1. Asserts that the goal target is greater than zero
    require(_goal > 0, "Goal must be greater than zero");

    // 2. Stores the details in the fundraisers mapping using the count as key
    fundraisers[fundraiserCount] = Fundraiser({
        id: fundraiserCount,
        owner: payable(msg.sender), // Casts the sender's address to a payable target
        title: _title,
        description: _description,
        goal: _goal,
        raised: 0,
        active: true
    });

    // 3. Broadcasts the event to notify off-chain indexers
    emit FundraiserCreated(
        fundraiserCount,
        msg.sender,
        _title,
        _goal
    );

    // 4. Increments the global counter for the next campaign index
    fundraiserCount++;
}
```

*   **Values Stored On-Chain**: `id` (uint256), `owner` (address), `title` (string), `description` (string), `goal` (uint256), `raised` (uint256), `active` (bool).
*   **Values NOT Stored On-Chain**: `category`, `people_affected`, `fundraiser_type` (which are sent to the frontend config contract wrapper but not written inside `contract.sol`'s actual implementation).
*   **Why?**: Storing data on-chain is expensive. Writing a new storage slot costs 20,000 gas units ($SSTORE$), so secondary fields (like category and people affected) are cached off-chain in the SQL database, while the blockchain is used strictly for storing the financial components (recipient wallet, fundraising goal, and funds raised).
*   **Gas Optimization Decisions**: Uses `calldata` instead of `memory` for string input parameters, which avoids copying arrays to memory and saves execution gas.

---

## SECTION 3 — SQL vs BLOCKCHAIN

| Field | Stored in | Why? |
| :--- | :--- | :--- |
| **`title`** | Both | Stored in SQL for fast searches and rendering on the homepage; stored on-chain in the crowdfunding contract to guarantee the integrity of the campaign's title. |
| **`description`** | Both | Stored in SQL to allow easy reading; stored on-chain to prevent organizers from changing the campaign's description to something else after receiving donations. |
| **`goal`** | Both | Stored in SQL for sorting and aggregation; stored on-chain to enforce automated closure rules (`raised >= goal`) inside the smart contract. |
| **`owner_wallet`** | Both | Stored in SQL to associate campaign items; stored on-chain to determine where donation funds should be routed. |
| **`category`** | SQL Only | Stored in SQL to allow categorizing and filtering. Omitted from the smart contract to avoid $SSTORE$ gas fees for non-financial data. |
| **`people_affected`**| SQL Only | Stored in SQL to display metrics. Omitted from the blockchain to avoid gas fees for non-financial data. |
| **`status`** | Both | Stored in SQL (`status` column) for fast listings; stored on-chain (`active` boolean) to enforce transfer blocks on closed campaigns. |
| **`raised`** | Both | Calculated in SQL via `SUM(amount)` joins; tracked on-chain inside the `raised` state variable to manage payment validation. |
| **`tx_hash`** | SQL Only | Stored in the `donations` table to prevent duplicate donation entries and provide verification links to Etherscan. |
| **`donationHash`** | Blockchain | Generated on the server and anchored to `DonationProofRegistry` to verify the integrity of the donation metadata. |
| **`anchor_tx_hash`** | SQL Only | Stored in the SQL database to link the cached metadata with the Sepolia transaction that anchored the proof. |

---

## SECTION 4 — DONATION FLOW (CRYPTO)

### Execution Trace

```text
User Browser               MetaMask Extension           CampusChainCrowdfunding            Express REST API
     |                             |                               |                            |
     |-- Submit Donation --------->|                               |                            |
     |                             |-- send transaction (donate) ->|                            |
     |                             |                               |-- Executes logic ---------+
     |                             |                               |   (Sends ETH to owner)     |
     |                             |<-- Returns tx receipt --------+----------------------------|
     |                             |                                                            |
     |-- POST /api/donate --------------------------------------------------------------------->|
     |   (Payload: fundraiser_id, amount, tx_hash)                                              |
     |                                                                                          |-- Record in DB (donations)
     |                                                                                          |-- Compute Donation Hash
     |                                                                                          |-- Anchor proof on contract
     |                                                                                          |-- Update DB (anchor_tx_hash)
     |<-- Return 200 Success -------------------------------------------------------------------|
```

1.  **Frontend Submit**:
    *   *File:* [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js) (Line 230).
    *   *Function Name:* `donateCrypto()`
2.  **MetaMask transaction broadcast**:
    *   *File:* [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js) (Line 238).
    *   *Snippet:*
        ```javascript
        const tx = await contract.methods.donate(fundraiserId).send({
          from: userAccount,
          value: web3.utils.toWei(amount, "ether")
        });
        ```
3.  **Smart Contract Execution**:
    *   *File:* [contract.sol](file:///d:/CampusChain/contract.sol) (Line 109).
    *   *Function Name:* `donate(uint256 _fundraiserId)`
    *   *Snippet:*
        ```solidity
        fundraiser.raised += msg.value;
        donations[_fundraiserId].push(Donation({donor: msg.sender, amount: msg.value, timestamp: block.timestamp}));
        fundraiser.owner.transfer(msg.value);
        emit DonationMade(_fundraiserId, msg.sender, msg.value);
        ```
4.  **Backend Notification**:
    *   *File:* [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js) (Line 249).
    *   *Snippet:*
        ```javascript
        const res = await fetch(`${API_BASE}/api/donate`, {
          method: "POST",
          headers: { ... },
          body: JSON.stringify({ fundraiser_id: fundraiserId, amount, tx_hash: tx.transactionHash })
        });
        ```
5.  **SQL Database Record**:
    *   *File:* [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js) (Line 7).
    *   *Function Name:* `donate(req, res)`
    *   *Calls:* `recordDonation` inside [donation.service.js](file:///d:/CampusChain/backend/services/donation.service.js#L6) (inserts record).
6.  **Anchoring Service**:
    *   *File:* [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L55).
    *   *Calls:* `anchorDonation` inside [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L176) to write the hash on-chain, followed by a database update to store `anchor_tx_hash`.

### Failure Scenario Behaviors

*   **User Rejects MetaMask**: MetaMask throws a user rejection error, falling into the `catch` block on [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js#L265). The process terminates, and the backend API is **never** called.
*   **Transaction Succeeds but Backend Fails**: The user's ETH is transferred to the NGO's wallet on-chain, but the backend fails to record it. The donation is not cached in the SQL database, making it look like the donation never occurred on the UI until a manual database sync is performed.
*   **Backend Succeeds but Blockchain Anchor Fails**: The donation is recorded in the SQL database, but the on-chain registry proof is missing. The controller catches the anchoring error on [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L63) and logs it, but returns a success response to the client anyway, leaving the database row's `anchor_tx_hash` set to `NULL`.
*   **Duplicate Donations**: If a duplicate `tx_hash` is submitted, [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L23-L33) checks for existing records:
    ```javascript
    const [existing] = await db.promise().query(
      "SELECT donation_id FROM donations WHERE tx_hash = ?",
      [tx_hash]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "This transaction hash has already been recorded." });
    }
    ```
    This check prevents the transaction from being recorded multiple times.

---

## SECTION 5 — DONATION FLOW (RAZORPAY)

### Detailed Flow Trace

1.  **Frontend Submit**:
    *   *File:* [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js) (Line 333).
    *   *Function Name:* `donateRazorpay()`
2.  **Order Creation on Backend**:
    *   *File:* [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js) (Line 340) calls `POST /api/razorpay/create-order`.
    *   *Controller:* `createOrder` in [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L165).
    *   *Snippet:*
        ```javascript
        const paiseAmount = Math.round(parsedAmount * 100);
        const order = await razorpay.orders.create({ amount: paiseAmount, currency, receipt });
        ```
3.  **Razorpay Modal checkout**:
    *   The frontend receives `order_id` and options, instantiates `new Razorpay(options)`, and calls `.open()` to display the checkout modal.
4.  **Payment Verification**:
    *   Upon successful payment, the frontend triggers `verifyRes = await fetch('/api/razorpay/verify')` (Line 383).
    *   *Controller:* `verifyPayment` in [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L58).
5.  **Signature Verification**:
    *   Recomputes the HMAC-SHA256 signature using the payment parameters and compares it with the client-provided signature.
6.  **Database insertion & On-Chain Anchoring**:
    *   Validates that the payment is not a duplicate.
    *   Inserts the record into the `donations` table.
    *   Generates a donation hash and anchors it on-chain via [anchorDonation](file:///d:/CampusChain/backend/services/blockchain.service.js#L176).

### Cryptographic Details

*   **HMAC Signature Formula**:
    $$\text{Payload} = \text{razorpay\_order\_id} + \text{"|"} + \text{razorpay\_payment\_id}$$
*   **Code Snippet**: [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L49-L53):
    ```javascript
    const crypto = await import("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    ```
*   **HMAC Secret**: `process.env.RAZORPAY_KEY_SECRET`
*   **Duplicate Payment Prevention**: Queries `SELECT donation_id FROM donations WHERE payment_reference = ?` on [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L103). If the payment ID exists, it returns a `409` conflict response, preventing duplicate records.

---

## SECTION 6 — BLOCKCHAIN SERVICES

This section covers the core blockchain methods defined in [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js).

### 1. `generateDonationHash`
*   *Snippet:* [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L92)
*   *Inputs:* `donationId`, `fundraiser_id`, `donor_address`, `amount`, `payment_method`, `payment_reference`, `donatedAt`.
*   *EVM ABI Packing representation:*
    ```javascript
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "address", "uint256", "string", "string", "uint256"],
      [BigInt(donationId), BigInt(fundraiser_id), cleanDonorAddress, amountEncoded, paymentMethodStr, paymentRefStr, BigInt(tsSeconds)]
    );
    return ethers.keccak256(encoded);
    ```
*   **Fields in Keccak256 hash**:
    $$\text{Hash} = \text{keccak256}(\text{ABIEncode}(\text{donation\_id}, \text{fundraiser\_id}, \text{donor\_address}, \text{amount}, \text{payment\_method}, \text{payment\_ref}, \text{timestamp\_sec}))$$
*   **Why these fields?**: These fields capture the identity and financial details of the donation (Who sent the funds, to which campaign, how much was sent, when it was sent, and what payment reference was used).
*   **Why not include others?**: Fields like `tx_hash` or `anchor_tx_hash` are omitted because they depend on the block execution context. Hashing must rely strictly on immutable fields so that the hash can be recomputed and verified identically off-chain.

### 2. `anchorDonation`
*   *Snippet:* [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L176)
*   *Explanation:* Connects to the contract instance using a signer wallet, calls the `anchorDonation` transaction, waits for the transaction to be mined using `tx.wait()`, and returns the transaction hash and block number.

### 3. `verifyDonation`
*   *Snippet:* [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js#L159)
*   *Explanation:* Performs a read-only view call to the `verifyDonation` contract method to check if the donation hash has been anchored.

---

## SECTION 7 — DATABASE SCHEMA & APIS

### 1. Table: `users`
*   **Purpose**: Manages user profiles, role assignments, and authorization credentials.
*   **Columns**: `id` (INT, PK), `name` (VARCHAR), `email` (VARCHAR, UNIQUE), `password_hash` (VARCHAR), `role` (ENUM), `wallet_address` (VARCHAR), `created_at` (TIMESTAMP).
*   **Foreign Keys**: *None*.
*   **Indexes**: Primary Key (`id`), Unique Index (`email`).
*   **API Usage**:
    *   `POST /signup`: Inserts a user record.
    *   `POST /login`: Queries the user record by email.
    *   `GET /api/profile` & `PUT /api/profile/update`: Queries and updates user profile data.

### 2. Table: `donor_details`
*   **Purpose**: Stores secondary profile metadata for users with the `'donor'` role.
*   **Columns**: `donor_id` (INT, PK, FK), `phone` (VARCHAR), `city` (VARCHAR), `state` (VARCHAR), `country` (VARCHAR), `donation_preference` (VARCHAR).
*   **Foreign Keys**: `donor_id` references `users(id)` with cascade deletion constraints.
*   **Indexes**: Primary Key (`donor_id`).

### 3. Table: `ngo_details`
*   **Purpose**: Stores secondary profile metadata for users with the `'ngo'` role.
*   **Columns**: `ngo_id` (INT, PK, FK), `organization_name` (VARCHAR), `registration_number` (VARCHAR), `contact_person` (VARCHAR), `contact_phone` (VARCHAR), `address` (TEXT).
*   **Foreign Keys**: `ngo_id` references `users(id)` with cascade deletion constraints.
*   **Indexes**: Primary Key (`ngo_id`).

### 4. Table: `fundraisers`
*   **Purpose**: Tracks campaign details, targets, and owners.
*   **Columns**: `fundraiser_id` (BIGINT, PK), `title` (VARCHAR), `description` (TEXT), `goal` (DECIMAL), `owner_wallet` (VARCHAR), `fundraiser_type` (ENUM), `category` (VARCHAR), `people_affected` (INT), `created_at` (TIMESTAMP), `status` (VARCHAR).
*   **Indexes**: Primary Key (`fundraiser_id`).
*   **API Usage**:
    *   `POST /api/fundraiser/create`: Inserts a campaign record.
    *   `GET /api/fundraisers` & `GET /api/fundraiser/:id`: Retrieves campaign records and calculates total funds raised.
    *   `PUT /api/fundraiser/:id/status`: Updates campaign status.

### 5. Table: `donations`
*   **Purpose**: Tracks transaction history, payment references, and on-chain proofs.
*   **Columns**: `donation_id` (INT, PK), `fundraiser_id` (BIGINT, FK), `donor_address` (VARCHAR), `amount` (DECIMAL), `tx_hash` (VARCHAR), `payment_method` (VARCHAR), `payment_reference` (VARCHAR), `donated_at` (TIMESTAMP), `anchor_tx_hash` (VARCHAR), `currency` (VARCHAR).
*   **Foreign Keys**: `fundraiser_id` references `fundraisers(fundraiser_id)`.
*   **Indexes**: Primary key (`donation_id`).
*   **API Usage**:
    *   `POST /api/donate` & `POST /api/razorpay/verify`: Inserts donation records and updates them with anchoring hashes.
    *   `GET /api/my-donations`: Retrieves donation records matching the user's wallet address.
    *   `GET /api/donation/:donationId/verify`: Queries donation metadata to recompute hashes.

### 6. Table: `comments`
*   **Purpose**: Stores user comments left on campaigns.
*   **Columns**: `comment_id` (INT, PK), `fundraiser_id` (BIGINT, FK), `user_id` (INT, FK), `comment_text` (TEXT), `commented_at` (TIMESTAMP).
*   **Foreign Keys**:
    *   `fundraiser_id` references `fundraisers(fundraiser_id)` with cascade deletion.
    *   `user_id` references `users(id)` with cascade deletion.
*   **Indexes**: Primary Key (`comment_id`).
*   **API Usage**:
    *   `POST /api/comment`: Inserts a comment record.
    *   `GET /api/comments/:id`: Retrieves comments left on a campaign.
    *   `DELETE /api/comments/:commentId`: Deletes a comment.

---

## SECTION 8 — PROJECT SEQUENCE DIAGRAMS

### 1. User Registration (`POST /signup`)
```text
User                auth.routes.js            auth.controller.js              TiDB Engine
 |                         |                          |                            |
 |--- POST /signup ------->|                          |                            |
 |                         |--- Call signup() ------->|                            |
 |                         |                          |--- hash password ----------|
 |                         |                          |--- INSERT INTO users ----->|
 |                         |                          |<-- Confirm Insert ---------|
 |                         |                          |--- INSERT details -------->|
 |                         |                          |<-- Confirm Insert ---------|
 |                         |<-- Return signup JSON ---|                            |
 |<-- 200 Success ---------|                          |                            |
```

### 2. Session Authentication (`POST /login`)
```text
User                auth.routes.js            auth.controller.js              TiDB Engine
 |                         |                          |                            |
 |--- POST /login -------->|                          |                            |
 |                         |--- Call login() -------->|                            |
 |                         |                          |--- SELECT WHERE email ---->|
 |                         |                          |<-- Return user row --------|
 |                         |                          |--- Compare Bcrypt hash ----|
 |                         |                          |--- Sign token -------------|
 |                         |<-- Return JWT token -----|                            |
 |<-- 200 Token -----------|                          |                            |
```

### 3. Create Fundraiser Campaign (`POST /api/fundraiser/create`)
```text
NGO User            fundraiser.routes.js        fundraiser.controller.js          TiDB Engine
 |                           |                             |                           |
 |--- POST /create --------->|                             |                           |
 |                           |--- verifyToken & NGO check -+                           |
 |                           |--- Call create() ---------->|                           |
 |                           |                             |--- INSERT fundraiser ---->|
 |                           |                             |<-- Confirm Insert --------|
 |                           |<-- Return fundraiserId -----|                           |
 |<-- 200 Created -----------|                             |                           |
```

### 4. Browse Fundraisers (`GET /api/fundraisers`)
```text
User                fundraiser.routes.js        fundraiser.controller.js          TiDB Engine
 |                           |                             |                           |
 |--- GET /fundraisers ----->|                             |                           |
 |                           |--- Call getAll() ---------->|                           |
 |                           |                             |--- SELECT JOIN query ---->|
 |                           |                             |<-- Return list of rows ---|
 |                           |<-- Return JSON array -------|                           |
 |<-- 200 OK ----------------|                             |                           |
```

### 5. MetaMask Donation Flow (`POST /api/donate`)
```text
Donor               donation.routes.js          donation.controller.js            TiDB Engine          Alchemy RPC Node
 |                           |                             |                           |                      |
 |--- POST /donate --------->|                             |                           |                      |
 |                           |--- verifyToken & Donor check+                           |                      |
 |                           |--- Call donate() ---------->|                           |                      |
 |                           |                             |-- Check tx_hash exists -->|                      |
 |                           |                             |-- INSERT pending record ->|                      |
 |                           |                             |-- anchorDonation() ----------------------------->|
 |                           |                             |<-- Return anchorTxHash --------------------------|
 |                           |                             |-- UPDATE anchor_tx_hash ->|                      |
 |                           |<-- Return success JSON -----|                           |                      |
 |<-- 200 Success -----------|                             |                           |                      |
```

### 6. Razorpay Donation Flow (`POST /api/razorpay/verify`)
```text
Donor               payment.routes.js           payment.controller.js             TiDB Engine          Alchemy RPC Node
 |                           |                             |                           |                      |
 |--- POST /verify --------->|                             |                           |                      |
 |                           |--- verifyToken & Donor check+                           |                      |
 |                           |--- Call verifyPayment() --->|                           |                      |
 |                           |                             |-- Compare HMAC secret ----|                      |
 |                           |                             |-- Check duplicates ------>|                      |
 |                           |                             |-- INSERT donation ------->|                      |
 |                           |                             |-- anchorDonation() ----------------------------->|
 |                           |                             |<-- Return anchorTxHash --------------------------|
 |                           |                             |-- UPDATE anchor_tx_hash ->|                      |
 |                           |<-- Return success JSON -----|                           |                      |
 |<-- 200 Success -----------|                             |                           |                      |
```

### 7. On-Chain Verification (`GET /api/donation/:donationId/verify`)
```text
Donor              donationVerification.routes  donationVerification.controller   TiDB Engine          Alchemy RPC Node
 |                           |                             |                           |                      |
 |--- GET /verify/104 ------>|                             |                           |                      |
 |                           |--- verifyToken & Donor check+                           |                      |
 |                           |--- Call verifyProof() ----->|                           |                      |
 |                           |                             |-- SELECT metadata ------->|                      |
 |                           |                             |-- Recompute Keccak256 ----|                      |
 |                           |                             |-- verifyDonation() ----------------------------->|
 |                           |                             |<-- Return true/false from contract --------------|
 |                           |<-- Return verified JSON ----|                           |                      |
 |<-- 200 Status ------------|                             |                           |                      |
```

### 8. Add Campaign Comment (`POST /api/comment`)
```text
User                comment.routes.js           comment.controller.js             TiDB Engine
 |                           |                             |                           |
 |--- POST /comment -------->|                             |                           |
 |                           |--- verifyToken check -------+                           |
 |                           |--- Call addComment() ------>|                           |
 |                           |                             |--- INSERT comment ------->|
 |                           |                             |<-- Confirm Insert --------|
 |                           |<-- Return success JSON -----|                           |
 |<-- 200 Success -----------|                             |                           |
```

---

## SECTION 9 — PRODUCTION IMPROVEMENTS

This section analyzes architectural limitations in the current implementation and proposes industry-standard solutions.

### 1. Database Transactions (ACID)
*   **Current Code:** During user registration in [auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js#L27-L45), rows are inserted into `users` followed by `donor_details` using independent, unlinked database queries.
*   **Problem:** If the second query fails (e.g. due to database timeout or connection drops), the first query is not rolled back, creating an orphan record in the `users` table.
*   **Industry Standard:** Wrap database queries in transaction blocks.
    ```javascript
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("INSERT INTO users ...");
      await connection.query("INSERT INTO donor_details ...");
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    ```

### 2. Decoupling Slow API Operations using Job Queues
*   **Current Code:** Inside [verifyPayment](file:///d:/CampusChain/backend/controllers/payment.controller.js#L140-L147), the backend calls `await anchorDonation(donationHash)` synchronously inside the API thread.
*   **Problem:** Blockchain network times can be slow. Holding the HTTP connection open while waiting for the transaction to be mined blocks the connection pool, creating a performance bottleneck.
*   **Industry Standard:** Write the transaction record to the SQL database immediately, push a task to an asynchronous job queue (e.g., BullMQ backed by Redis), and return a success response to the client immediately. Background workers then handle the anchoring process asynchronously.

### 3. Payment Webhooks
*   **Current Code:** The frontend is responsible for notifying the backend of successful payments by calling the verify API in [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js#L383).
*   **Problem:** If the user closes the browser or loses connectivity after the payment completes but before the verify request is sent, the donation will not be recorded in the database.
*   **Industry Standard:** Implement webhook listeners (`POST /api/razorpay/webhook`). Razorpay servers notify the webhook endpoint directly when a payment succeeds, ensuring transactions are recorded even if the user closes their browser.

### 4. Database Concurrency Control
*   **Current Code:** Updates to campaign metrics are calculated using raw database additions or updates without locking.
*   **Problem:** Concurrent database operations can step on each other, causing race conditions and incorrect totals.
*   **Industry Standard:** Implement optimistic locking using version checks, or pessimistic locking (`SELECT FOR UPDATE`) on target rows during financial updates.

---

## SECTION 10 — MOCK INTERVIEW QUESTIONS & IDEAL ANSWERS

#### Q1: Inside the `verifyToken` middleware, the JWT verification callback throws an `ExpressError` inside an asynchronous block. What is the execution consequence of this implementation in Express?
*   *Ideal Answer:* Because `jwt.verify` is asynchronous when a callback is provided, any error thrown inside its callback executes outside the context of the Express middleware promise chain. Express's standard router error handlers cannot catch this exception, resulting in an unhandled exception that crashes the entire Node.js runtime process. To fix this, you must pass the error to `next(err)` instead of throwing it, or use the synchronous version of `jwt.verify`.

#### Q2: How does the connection pool manage database queries under sudden, high load spikes? What is the role of `queueLimit`?
*   *Ideal Answer:* The database connection pool is configured with `connectionLimit: 10`. When all 10 connections are active, subsequent queries are placed in an internal queue. Since `queueLimit` is set to `0` (unlimited), queries will queue indefinitely. Under sudden load spikes, this queue can grow large, consuming memory and causing requests to time out. In production, you should set a finite `queueLimit` to fail fast and prevent memory leaks.

#### Q3: Explain why hardcoding `amount / 300000.0` inside the SQL aggregation query is a major architectural problem for a multi-currency payment platform.
*   *Ideal Answer:* Hardcoding the exchange rate directly in SQL queries assumes a static, fixed exchange rate (e.g. 1 ETH = 300,000 INR). This is problematic because currency exchange rates fluctuate constantly. In production, exchange rates should be queried dynamically from an oracle or external API, or stored in a database table with historical exchange rates.

#### Q4: Why is standard comparison (`===`) vulnerable to timing attacks when verifying Razorpay signatures?
*   *Ideal Answer:* Standard string comparison (`===`) compares strings character by character and exits early on the first mismatch. This allows attackers to estimate the signature character by character by measuring differences in response times. To prevent this timing leak, you should use `crypto.timingSafeEqual`, which compares strings in constant time.
