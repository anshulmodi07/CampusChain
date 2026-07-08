# 🎓 CampusChain

![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-REST%20API-000000?style=for-the-badge&logo=express&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-Smart%20Contracts-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia%20Testnet-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)
![ethers.js](https://img.shields.io/badge/ethers.js-Web3%20Library-2535A0?style=for-the-badge&logoColor=white)
![MetaMask](https://img.shields.io/badge/MetaMask-Wallet-F6851B?style=for-the-badge&logo=metamask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-TiDB%20Cloud-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Let's Encrypt](https://img.shields.io/badge/SSL-Let's%20Encrypt-003A70?style=for-the-badge&logo=letsencrypt&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**CampusChain** is a hybrid Web2/Web3 crowdfunding platform designed for college campuses to bring **transparency** and **trust** into student-led fundraising. It uses the blockchain as a public, immutable ledger so that fundraising data and transactions can be independently verified without relying on blind trust in organizers.

---

## 🌐 Live Deployment

- **Frontend (Netlify):** https://campuschain07.netlify.app
- **Backend API (AWS EC2):** https://campuschain.online
- **Crowdfunding Contract (Etherscan):** [0x4bd64A1f096c7eaBbeC73886CDD9Fb8c672036dc](https://sepolia.etherscan.io/address/0x4bd64A1f096c7eaBbeC73886CDD9Fb8c672036dc)
- **Proof Registry Contract (Etherscan):** [0x26Fa74BAC10e74D2D02F0F40187e833A221fE112](https://sepolia.etherscan.io/address/0x26Fa74BAC10e74D2D02F0F40187e833A221fE112)

---

## 🎥 Demo Video

Watch a full walkthrough of CampusChain, explaining the problem, architecture, and live demo:

📺 **[Watch the demo video](https://drive.google.com/file/d/1ggKxY5vZbAyPPcyznEWltzQ9AaclkdGc/view?usp=sharing)**

---

## 🔐 Demo Login Credentials

**NGO / Organizer**
- Email: `ngo@gmail.com`
- Password: `123`

**Donor**
- Email: `donor@gmail.com`
- Password: `123`

---

## 🚩 Problem Statement

In college campuses, fundraising is common for:
- 🎪 Fests and cultural events
- 🤝 Student clubs and societies
- 🚑 Social causes and emergency relief

**The Core Issue:**
The problem is not payments, but a **lack of transparency**. Today:
1. Fundraising records are maintained privately (Excel sheets, screenshots, manual reports).
2. Donors have no independent way to verify how much money was actually raised or whether transaction proofs are real.
3. Trust is placed entirely on organizers, and system administrators can alter fundraising metrics behind the scenes (a single point of failure).

This discourages participation and creates accountability concerns, even when intentions are genuine.

---

## 💡 Solution: CampusChain

CampusChain solves this by creating a **trust layer** that combines rapid fiat onboarding with Web3 immutability:

- **On-Chain Recording:** Every fundraiser and donation is recorded on the blockchain, publicly verifiable and cannot be altered.
- **Dual-Currency Gateways:** Supports direct Web3 Ethereum donations via **MetaMask** alongside card/UPI fiat checkouts via **Razorpay**, displaying standardized native and converted currency balances (`1 ETH = ~₹3,00,000 INR`).
- **On-Chain Cryptographic Proof Registry:** Automatically hashes and anchors donation details to a dedicated Ethereum Sepolia Testnet contract in the background, providing a public verification receipt.
- **Etherscan Verification Portal:** A **🔒 Verify Proof** interface on the Donor Dashboard lets donors view on-chain audit proof records and jump directly to the corresponding Sepolia block transactions.
- **NGO Campaign Control Panel:** NGO campaign owners can close/re-open campaigns, update description briefs in real-time, view contributor ledgers, and delete/moderate comments.
- **Bookmarks, Watchlist & Filters:** Instant text search, category tab filters (Education, Healthcare, Clubs, etc.), heart favoriting shortcuts, and a persistent **My Watchlist** panel.
- **Decentralization:** No single organizer or admin can modify fundraising data behind the scenes; anyone can audit the data.

> **Note:** Blockchain is used here as a *ledger of truth*, not just as a payment replacement.

---

## ❓ Why Web3? Why Not Web2?

A Web2 system (standard database) can store data, but it falls short on trust:

| Feature | Web2 (Traditional) | Web3 (CampusChain) |
| :--- | :--- | :--- |
| **Control** | Database controlled by a single authority | Decentralized ledger |
| **Integrity** | Records can be edited, deleted, or hidden | **Immutable** – records cannot be altered |
| **Transparency** | Depends on the honesty of the admin | **Trustless** – anyone can audit the data |

For this specific problem, Web3 is **essential**, not optional.

---

## 🏗 Deployment Architecture

```
                        Users
                           │
                           ▼
              Netlify (Frontend - HTML/CSS/JS)
                           │
                       HTTPS (443)
                           │
                           ▼
               https://campuschain.online
                           │
                           ▼
              AWS EC2 (Ubuntu 24.04 LTS)
                           │
                 Nginx Reverse Proxy
                           │
                           ▼
                     PM2 Process Manager
                           │
                           ▼
                Node.js + Express Backend
                           │
          ┌────────────────┴────────────────┐
          │                                  │
          ▼                                  ▼
   TiDB Cloud (MySQL)              Ethereum Sepolia
```

### 🔄 Request Flow

```
Browser
    │
    ▼
Netlify
    │
  HTTPS
    ▼
campuschain.online
    │
  Nginx
    │
   PM2
    │
Node.js (Express)
    │
 ┌──┴──────────────┐
 │                  │
 ▼                  ▼
TiDB Cloud     Ethereum Sepolia
```

### Architecture Components

- **Frontend (Netlify):** Serves the static client, connects with MetaMask wallets, and handles client-side Web3.js/ethers.js contract initializations; deployed automatically via GitHub.
- **Backend (AWS EC2):** Node.js + Express REST APIs running on Ubuntu 24.04 LTS, managed by PM2 and served behind an Nginx reverse proxy; handles authentication, authorization, and application logic.
- **Database (TiDB Cloud / MySQL):** Distributed relational database hosting user records, fundraiser profiles, comments, donations, and transaction metadata for fast UI rendering.
- **Smart Contracts (Solidity / Sepolia):**
  - `CampusChainCrowdfunding.sol`: Manages campaign states and signs client-side donations.
  - `DonationProofRegistry.sol`: Performs backend server-side proof-registry anchoring, acting as the immutable ledger of truth.

---

## ☁️ Cloud Infrastructure

### Frontend
- **Hosting:** Netlify
- **Framework:** HTML, CSS, JavaScript
- **Deployment:** Automatic via GitHub
- **Live URL:** https://campuschain07.netlify.app

### Backend
- **Server:** AWS EC2 (Ubuntu Server)
- **Runtime:** Node.js + Express.js
- **Process Manager:** PM2 — keeps the server alive, auto-restarts on crashes, and starts automatically after reboot
- **Reverse Proxy:** Nginx — handles HTTPS termination and forwards requests to Node.js (public ports 80 & 443); Node.js itself runs internally on `localhost:5000` and is not directly exposed to the internet

### Domain & SSL
- **Custom Domain:** https://campuschain.online (DNS points to the AWS EC2 public IP)
- **SSL:** HTTPS secured via Let's Encrypt / Certbot, with automatic certificate renewal

### Database
- **TiDB Cloud (MySQL):** Stores users, fundraisers, donations, comments, and transaction metadata

### Blockchain
- **Ethereum Sepolia Testnet:** Smart contracts handle fundraiser verification, donation recording, proof-registry anchoring, and transparent transactions

---

### 🔗 Smart Contracts

The smart contracts form the core Web3 layer and are responsible for:

- ✅ Fundraiser creation and on-chain state management
- 💰 Recording donations immutably on the blockchain
- 🔄 Managing fundraiser lifecycle (active, completed)
- 🔒 Anchoring cryptographic donation proofs for independent verification
- ⚓ Anchoring expense reports via hash references (future-ready)

> **Note:** MetaMask is used strictly as a transaction-signing interface to demonstrate blockchain-based transparency; the core value lies in the immutable public ledger, not payments.

---

## ⚙️ Tech Stack

**Frontend**
- HTML, CSS, JavaScript

**Backend**
- Node.js
- Express.js
- JWT-based authentication

**Database**
- MySQL (TiDB Cloud)

**Blockchain**
- Ethereum (Sepolia Testnet)
- ethers.js
- Solidity

**Payments**
- MetaMask (native ETH donations)
- Razorpay (card/UPI fiat onboarding)

**Cloud & DevOps**
- AWS EC2 (Ubuntu 24.04 LTS)
- Nginx (reverse proxy, HTTPS termination)
- PM2 (process management)
- Let's Encrypt / Certbot (SSL)
- Netlify + GitHub (frontend CI/CD)

---

## 🔐 Security & Access Control

- JWT-based authentication for all protected backend routes
- Role-based access control (NGO vs Donor) enforced at the API level
- HTTPS enabled end-to-end via Let's Encrypt
- Backend process isolated behind Nginx; public access limited to ports 80 & 443
- Node.js backend managed securely through PM2
- Smart contract state is immutable and publicly verifiable on-chain

---

## 📁 Project Structure

```text
campuschain/
├── backend/
│   ├── controllers/
│   ├── db/
│   ├── middlewares/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   └── server.js
│   └── certs
│
├── frontend/
│   ├── contractConfig.js
│   ├── src/
│   ├── index.html
│   ├── fundraiser.html
│   ├── create-fundraiser.html
│   ├── donor-dashboard.html
│   ├── ngo-dashboard.html
│   ├── login.html
│   └── (Associated .js files)
│
└── contract.sol
```

---

## 🚀 Deployment Workflow

```
Developer
     │
     ▼
GitHub
     │
     ├──────────────► Netlify
     │                    │
     │                    ▼
     │             Frontend Deployment
     │
     └──────────────► AWS EC2
                          │
                          ▼
                   Git Pull / PM2 Restart
                          │
                          ▼
                    Production Backend
```

---

## 🏃 Running Locally

> **Note:** The project is already deployed. Local setup is only required if you want to run it locally.

### 1. Backend Server
Create a `backend/.env` file with your environment variables:

```env
DB_HOST=your-tidb-host
DB_NAME=campuschain
DB_USER=your-user
DB_PASS=your-password
DB_PORT=4000
JWT_SECRET=your-secret
PROOF_REGISTRY_ADDRESS=0x26Fa74BAC10e74D2D02F0F40187e833A221fE112
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
ANCHOR_PRIVATE_KEY=your-sepolia-wallet-private-key
```

Install dependencies and run:

```bash
cd backend
npm install
npm start
```

### 2. Frontend Client
Simply open the HTML files in `frontend/` directly in a browser, or serve the folder with any static file server:

```bash
cd frontend
npx serve .
```

---

## 📌 Production Features

- AWS Cloud Deployment
- HTTPS Enabled with Custom Domain
- Automatic SSL Renewal
- Reverse Proxy Architecture (Nginx)
- Process Management with PM2
- Cloud Database (TiDB Cloud)
- Blockchain Integration (Ethereum Sepolia) with dual smart contracts
- Automatic Frontend Deployment via Netlify

---

## 📚 Architecture Decisions

**Why AWS EC2?**
Provides complete control over the server environment, networking, deployment pipeline, and infrastructure configuration.

**Why Nginx?**
Acts as a reverse proxy, handles HTTPS termination, and securely forwards requests to the backend service.

**Why PM2?**
Ensures the backend remains online by automatically restarting crashed processes and starting the application after server reboots.

**Why TiDB Cloud?**
Provides a managed MySQL-compatible distributed database without requiring self-hosted database administration.

**Why Netlify?**
Enables fast frontend deployment with GitHub integration and automatic redeployments.

---

## 🔮 Future Scope

- **DAO Governance:** Integrate governance structures to allow donors to vote on milestone-based fund releases.
- **IPFS Storage:** Store receipts, photos, and spending reports on IPFS with hash links on-chain.
- **Soulbound Tokens (SBTs):** Issue non-transferable reward tokens to student donors as verified badges of contribution.
- **Expense Verification:** Dashboards for tracking fund utilization after a campaign closes.

---

## 🏁 Summary

CampusChain demonstrates how Web3 can solve a real campus-level problem by replacing blind trust with verifiable transparency. By using blockchain as a public ledger, the platform ensures accountability by design — something traditional Web2 systems cannot guarantee.

---

## 📬 Contact

**Maintainer:** Anshul Modi — `anshul2812modi@gmail.com`

---

## 📄 License

MIT License — see `LICENSE` file.
