# 🎓 CampusChain

**CampusChain** is a Web3-based crowdfunding platform designed for college campuses to bring **transparency** and **trust** into student-led fundraising. It uses blockchain as a public, immutable ledger so that fundraising data can be independently verified without relying on blind trust in organizers.

---

## 🌐 Live Deployment

- **Frontend (Netlify):** https://campuschain07.netlify.app
- **Backend API (AWS EC2):** https://campuschain.online
- **Smart Contract (Etherscan):**
  https://sepolia.etherscan.io/address/0x4bd64A1f096c7eaBbeC73886CDD9Fb8c672036dc

---

## 🔐 Demo Login Credentials

**NGO**
- Email: `ngo@gmail.com`
- Password: `123`

**Donor**
- Email: `donor@gmail.com`
- Password: `123`

---

## 🚩 Problem Statement

In college campuses, fundraising is common for:
* 🎪 Fests and cultural events
* 🤝 Student clubs and societies
* 🚑 Social causes and emergency relief

**The Core Issue:**
The problem is not payments, but a **lack of transparency**. Today:
1. Fundraising records are maintained privately (Excel sheets, screenshots, manual reports).
2. Donors have no independent way to verify how much money was raised.
3. Trust is placed entirely on organizers.

This discourages participation and creates accountability concerns, even when intentions are genuine.

---

## 💡 Solution: CampusChain

CampusChain solves this problem by using blockchain as a **trust layer**:

* **On-Chain Recording:** Every fundraiser and donation is recorded on the blockchain.
* **Immutability:** Records are publicly verifiable and cannot be altered.
* **Decentralization:** No single organizer or admin can modify fundraising data behind the scenes.
* **Verification:** Donors can independently verify totals without trusting intermediaries.

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

- **Frontend (Netlify):** Static HTML/CSS/JS site, deployed automatically via GitHub; consumes backend APIs and verifies fundraising data directly from the blockchain.
- **Backend (AWS EC2):** Node.js + Express REST APIs running on Ubuntu 24.04 LTS, managed by PM2 and served behind an Nginx reverse proxy; handles authentication, authorization, and application logic.
- **Database (MySQL / TiDB Cloud):** Stores users, fundraisers, donations, comments, and transaction metadata for fast UI rendering.
- **Blockchain (Ethereum Sepolia):** Serves as the immutable ledger of truth for fundraiser creation and donation records.

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
- **Ethereum Sepolia Testnet:** Smart contracts handle fundraiser verification, donation recording, and transparent transactions

---

### 🔗 Smart Contract

The smart contract forms the core Web3 layer and is responsible for:

- ✅ Fundraiser creation and on-chain state management
- 💰 Recording donations immutably on the blockchain
- 🔄 Managing fundraiser lifecycle (active, completed)
- ⚓ Anchoring expense reports via hash references (future-ready)

> **Note:** MetaMask is used strictly as a transaction-signing interface to demonstrate blockchain-based transparency; the core value lies in the immutable public ledger, not payments.

---

## ⚙️ Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript

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

**Cloud & DevOps**
- AWS EC2 (Ubuntu 24.04 LTS)
- Nginx (reverse proxy, HTTPS termination)
- PM2 (process management)
- Let's Encrypt / Certbot (SSL)
- Netlify + GitHub (frontend CI/CD)

**Wallet**
- MetaMask (transaction signing and user authorization)

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

## 🏃 Running Locally

> **Note:** The project is already deployed. Local setup is only required if you want to run it locally.

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
Simply open the HTML files in `frontend/` directly in a browser, or serve the folder with any static file server, e.g.:
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
- Blockchain Integration (Ethereum Sepolia)
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

- **Hybrid Payments:** Integration of UPI/Razorpay with on-chain verification
- **DAO Governance:** Community voting for fund release
- **Expense Verification:** Dashboards for tracking utilization
- **IPFS Storage:** Decentralized document storage for receipts/proofs

---

## 🏁 Summary

CampusChain demonstrates how Web3 can solve a real campus-level problem by replacing blind trust with verifiable transparency. By using blockchain as a public ledger, the platform ensures accountability by design — something traditional Web2 systems cannot guarantee.

---

## 📬 Contact

**Maintainer:** Anshul Modi — `anshul2812modi@gmail.com`

---

## 📄 License

MIT License — see `LICENSE` file.
