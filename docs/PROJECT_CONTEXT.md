# CampusChain Project Context

> This is the entry point and canonical project context document for all contributors and AI agents.
> Read this document before beginning any work on the codebase.

---

## 1. Project Overview
CampusChain is a hybrid Web2 + Web3 crowdfunding platform tailored for college campuses. It is designed to bring trust, immutability, and transparency to student-led fundraising (e.g., fests, clubs, social emergencies). 

While traditional Web2 platforms record financial targets privately, CampusChain uses the blockchain as a public ledger of truth. All fundraiser metadata is cached in a fast Web2 database, while verified donations and goals are cryptographically anchored and audited on-chain.

---

## 2. Current Status & Roadmap
* **Project Status**: 🟡 Active Development (Version 2.4 - Hybrid Payment Consistency)
* **Active Branch**: `campuschain-v2`
* **Production Branch**: `main`
* **Current Version**: `2.4` (Integrating MetaMask & Razorpay into a consistent user dashboard/experience)

---

## 3. Technology Stack

### Frontend (Static Web Application)
* **Core**: HTML5, Vanilla CSS, Vanilla JavaScript (ES Modules)
* **Web3 Integration**: `ethers.js` (Web3 MetaMask client orchestration)
* **External Integration**: Razorpay Web Checkout SDK (embedded popup)

### Backend (REST API Service)
* **Runtime**: Node.js
* **Framework**: Express.js
* **SDKs/Libraries**: `mysql2` (Connection Pool), `jsonwebtoken` (JWT Security), `ethers.js` (Server-side proof verification/anchoring), `crypto` (HMAC signatures)

### Database (Web2 Caching & Indexing)
* **Engine**: TiDB Cloud (MySQL-Compatible Serverless Database)
* **Storage**: Persistent relational schema for users, fundraisers, donations, and comments

### Blockchain (Web3 Trust Layer)
* **Network**: Ethereum Sepolia Testnet
* **Contracts**: `contract.sol` (Solidity smart contract managing on-chain campaigns and donation hashes)

---

## 4. Current Architecture & Deployment

### Flow Architecture
* **Ethereum MetaMask Flow**:
  User → Signs Tx in MetaMask → Tx broadcasted to Sepolia → Tx Hash submitted to API → `recordDonation()` writes to TiDB → `anchorDonation()` records receipt on-chain.
* **Razorpay Flow**:
  User → Pays via INR → Signature verification → API validates payload → `recordDonation()` writes to TiDB → `anchorDonation()` records receipt on-chain.

### Deployment Infrastructure
* **Frontend**: Netlify (continuous deployment of static files)
* **Backend**: AWS EC2 (Express.js runtime managed by Nginx & PM2)
* **Reverse Proxy**: Nginx (terminates SSL certificates via Let's Encrypt)
* **Domain**: `campuschain.online` (Production API Base)

---

## 5. Branch Strategy & Engineering Philosophy
* **Branch Rules**: All development must take place on the version-specific development branch (currently `campuschain-v2`). Direct pushes or merges to `main` are strictly prohibited.
* **Staff Philosophy**:
  * **Think first, Code second**: Focus on root-cause analysis over quick patches.
  * **Thin Controllers**: Controllers validate shape and return responses. All business logic must reside within the Services layer.
  * **Blockchain is a Ledger**: The blockchain is used strictly as a trust ledger, not as a transaction processor.

---

## 6. Immutable Core (Never Change Without Discussion)
1. **Canonical Currency (ETH)**: Ethereum remains the canonical fundraising unit of the application. Goal calculations and totals are performed in ETH. Razorpay (INR) values are dynamically converted into ETH equivalents.
2. **On-Chain Anchor Verification**: Every donation record must eventually produce a matching cryptographic proof on the blockchain.
3. **No Direct Production Modifications**: Live databases, PM2 tasks, or remote endpoints should never be manually tweaked; all changes must flow through local verification and git integration.

---

## 7. Current Known Limitations
* **Fixed Conversion Rate**: Currency conversion between INR and ETH is currently hardcoded at a static conversion rate (`1 ETH = 300,000 INR`).
* **Mock Blockchain Fallback**: In the absence of blockchain credentials (`RPC_URL`, `ANCHOR_PRIVATE_KEY`) in local environments, anchoring silently degrades to a mock transaction simulation.
* **AWS Load Balancer Timeout**: Stale database connections throw `ECONNRESET` due to AWS NAT Gateway terminating idle TCP sockets after 350 seconds. This is mitigated using keep-alive probes and 60-second idle timeouts on the database pool.
