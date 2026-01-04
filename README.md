# CampusChain

CampusChain is a Web3-based crowdfunding platform designed for **college campuses** to bring **transparency and trust** into student-led fundraising. It uses **blockchain as a public, immutable ledger** so that fundraising data can be independently verified without relying on blind trust in organizers.

---

## 🚩 Problem Statement

In college campuses, fundraising is common for:
- Fests and cultural events  
- Student clubs and societies  
- Social causes and emergency relief  

However, the core issue is **not payments**, but **lack of transparency**.

Today:
- Fundraising records are maintained privately (Excel sheets, screenshots, manual reports)
- Donors have no independent way to verify how much money was raised
- Trust is placed entirely on organizers

This discourages participation and creates accountability concerns, even when intentions are genuine.

---

## 💡 Solution: CampusChain

CampusChain solves this problem by using **blockchain as a trust layer**.

- Every fundraiser and donation is recorded on-chain
- Records are **immutable and publicly verifiable**
- No single organizer or admin can modify fundraising data
- Donors can independently verify totals without trusting intermediaries

> **Blockchain is used here as a ledger of truth, not as a payment replacement.**

---

## ❓ Why Web3? Why Not Web2?

A Web2 system can store data in a database, but:
- The database is controlled by a single authority
- Records can be edited, deleted, or hidden
- Transparency still depends on trust

Blockchain enables:
- **Immutability** – records cannot be altered  
- **Public verification** – anyone can audit fundraising data  
- **Trustless transparency** – no central authority is required  

For this problem, **Web3 is essential**, not optional.

---

## 🧠 Architecture Overview

CampusChain follows a **hybrid architecture**:

```text
Frontend (HTML/CSS/JS)
        |
        |  REST APIs
        v
Backend (Node.js + Express)
        |
        |  Metadata indexing
        v
MySQL Database
        |
        |  Verification
        v
Blockchain (Ethereum via MetaMask)
MySQL: Stores fundraiser metadata (title, description, category) for fast UI rendering

Blockchain: Acts as the immutable ledger for donations and fundraiser state

Frontend: Fetches metadata from backend and verifies financial data from blockchain

🔗 Smart Contract (Core Web3 Component)

The smart contract handles:

Fundraiser creation

On-chain donations (payable)

Fundraiser lifecycle (active, completed, deleted)

Expense report anchoring (via hash references)

The frontend interacts with the blockchain using MetaMask and the contract ABI.

MetaMask is used in this prototype to demonstrate blockchain-based transparency, not as the final payment experience.

📁 Project Structure

campuschain/
├── backend/
│   ├── controllers/
│   ├── db/
│   ├── middlewares/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   └── server.js
│
├── frontend/
│   ├── contractConfig.js
│   ├── index.html
│   ├── index.js
│   ├── fundraiser.html
│   ├── fundraiser.js
│   ├── fundraiser-detail.html
│   ├── fundraiser-detail.js
│   ├── create-fundraiser.html
│   ├── create-fundraiser.js
│   ├── donor-dashboard.html
│   ├── donor-dashboard.js
│   ├── ngo-dashboard.html
│   ├── ngo-dashboard.js
│   ├── login.html
│   ├── login.js
│   └── signup.html
│
└── contract.sol
⚙️ Tech Stack

Frontend: HTML, CSS, JavaScript

Backend: Node.js, Express.js

Database: MySQL

Blockchain: Ethereum (via MetaMask)

Web3 Library: ethers.js

Smart Contracts: Solidity
🚀 Running the Project Locally
Backend
cd backend
npm install
npm start

Frontend

Open frontend/index.html in the browser

Ensure MetaMask is installed and connected to the correct network

🔮 Future Scope

Hybrid payments (UPI / Razorpay with on-chain verification)

DAO-based governance for fund release

Expense verification dashboards

IPFS-based document storage

Campus-wide adoption with alumni participation
🏁 Summary

CampusChain demonstrates how Web3 can solve a real campus-level problem by replacing blind trust with verifiable transparency. By using blockchain as a public ledger, the platform ensures accountability by design — something traditional Web2 systems cannot guarantee.
