# CampusChain: Comprehensive Technical Study Report

This document is a technical walkthrough of your codebase. Use it to study the implementation details and design tradeoffs of the **CampusChain** crowdfunding application for your upcoming interview.

---

## 1. Repository Directory Structure & Imports

### Backend Structure
* [backend/server.js](file:///d:/CampusChain/backend/server.js): Simple entry point that loads environment variables and starts the Express server.
  - *Imports:* `dotenv`, `./app.js`
* [backend/app.js](file:///d:/CampusChain/backend/app.js): Configures global middlewares (CORS, JSON parsing, static file routing) and mounts router sub-modules.
  - *Imports:* `express`, `cors`, `path`, `url`, `./db/index.js`, `./middlewares/error.middleware.js`, `./routes/auth.routes.js`, `./routes/fundraiser.routes.js`, `./routes/donation.routes.js`, `./routes/payment.routes.js`, `./routes/comment.routes.js`, `./routes/profile.routes.js`, `./routes/donationVerification.routes.js`
* [backend/db/index.js](file:///d:/CampusChain/backend/db/index.js): Establishes a connection pool to TiDB Cloud using the `mysql2` driver.
  - *Imports:* `mysql2`, `fs`, `path`, `url`, `dotenv`
* [backend/middlewares/auth.middleware.js](file:///d:/CampusChain/backend/middlewares/auth.middleware.js): Implements session authentication and role verification filters.
  - *Imports:* `jsonwebtoken`, `../utils/ExpressError.js`
* [backend/controllers/auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js): Processes user registration (with passwords hashed by `bcrypt`) and authentication JWT generation.
  - *Imports:* `bcrypt`, `jsonwebtoken`, `../db/index.js`, `../utils/ExpressError.js`
* [backend/controllers/donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js): Handles routing logic to log crypto payments and verify proofs.
  - *Imports:* `../db/index.js`, `../utils/ExpressError.js`, `../services/donation.service.js`, `../services/blockchain.service.js`
* [backend/services/donation.service.js](file:///d:/CampusChain/backend/services/donation.service.js): Executes SQL operations to insert donation details.
  - *Imports:* `../db/index.js`
* [backend/services/blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js): Computes deterministic hashes and broadcasts anchoring transactions via RPC.
  - *Imports:* `ethers`, `../utils/ExpressError.js`
* [backend/controllers/payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js): Manages Razorpay orders and verifies payment signatures.
  - *Imports:* `razorpay`, `../utils/ExpressError.js`, `../db/index.js`, `../services/donation.service.js`, `../services/blockchain.service.js`, `crypto`

### Frontend Structure
* [frontend/contractConfig.js](file:///d:/CampusChain/frontend/contractConfig.js): Contains the hardcoded deployed smart contract address and the Web3 contract ABI.
* [frontend/fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js): Manages UI interactions, handles MetaMask wallet contract calls, and hosts the Razorpay checkout overlay.
  - *Imports:* `./config/api.js`, `./navbar.js`, `./utils/date.js`
* [frontend/login.js](file:///d:/CampusChain/frontend/login.js): Handles user login, processes responses, and stores the JWT session client-side.
  - *Imports:* `./config/api.js`

---

## 2. File-by-File Code Walkthrough

### 1. [backend/server.js](file:///d:/CampusChain/backend/server.js) & [backend/app.js](file:///d:/CampusChain/backend/app.js)

#### [backend/server.js](file:///d:/CampusChain/backend/server.js)
```javascript
import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```
* **Explanation:**
  - `dotenv.config()` loads variables from the `.env` file into `process.env`.
  - `app.listen(PORT, ...)` starts the Express HTTP server, listening on port 5000 or the environment-specified port.
* **Interview Trap:** An interviewer might ask: *"Does calling `dotenv.config()` here make variables available in imported files?"* Yes, because ES Modules are loaded sequentially; importing `app.js` *after* running `dotenv.config()` guarantees that variables are populated before the sub-modules initialize.

#### [backend/app.js](file:///d:/CampusChain/backend/app.js)
```javascript
import express from "express";
import cors from "cors";
import db from "./db/index.js";
import path from "path";
import { fileURLToPath } from "url";
import errorMiddleware from "./middlewares/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import fundraiserRoutes from "./routes/fundraiser.routes.js";
import donationRoutes from "./routes/donation.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import donationVerificationRoutes from "./routes/donationVerification.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("DB test failed:", err);
      return res.status(500).send("DB ERROR");
    }
    res.send("DB OK");
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "CampusChain Backend" });
});

app.use(profileRoutes);
app.use(authRoutes);
app.use(fundraiserRoutes);
app.use(donationRoutes);
app.use(paymentRoutes);
app.use(donationVerificationRoutes);
app.use(commentRoutes);
app.use(errorMiddleware);

export default app;
```
* **Explanation:**
  - `app.use(cors())` sets default headers allowing any domain to execute requests against this API.
  - `app.use(express.json())` parses incoming request bodies with JSON payloads, attaching parsed objects to `req.body`.
  - `express.static(...)` configures Express to serve static UI pages (HTML, CSS, JS) directly from the `frontend` folder.
  - `app.use(...)` mounts routers for different domain areas.
  - `app.use(errorMiddleware)` is placed last in the stack to capture any unhandled router exceptions.
* **Interview Trap:** Notice that route registration occurs *without* path prefixes in `app.js` (e.g., `app.use(authRoutes)`). This means paths are defined directly inside their respective router files. Pay attention to how `/login` is registered in `auth.routes.js` compared to `/api/donate` in `donation.routes.js`.

---

### 2. [backend/db/index.js](file:///d:/CampusChain/backend/db/index.js)
```javascript
import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

console.log("DB_USER =", process.env.DB_USER);
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_PASS =", process.env.DB_PASS ? "EXISTS" : "MISSING");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  timezone: "Z",

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  queueLimit: 0,
});

export default db;
```
* **Explanation:**
  - Instantiates a connection pool to TiDB Cloud using the `mysql2` client.
  - `connectionLimit: 10` limits the pool size to a maximum of 10 concurrent active database sessions.
  - `ssl: { rejectUnauthorized: false }` enforces TLS encryption on connections to the managed TiDB database without rejecting certificates signed by unknown authorities.
  - `timezone: "Z"` sets the database connection session timezone to UTC.
* **Interview Trap:** An interviewer may ask: *"What happens under heavy load when connection limit is 10 and queueLimit is 0?"*
  - `queueLimit: 0` means there is no limit to the queue size; incoming queries will wait indefinitely in memory for an available pool slot. Under heavy load, this can lead to memory exhaustion (OOM crashes) instead of failing fast.

---

### 3. [backend/middlewares/auth.middleware.js](file:///d:/CampusChain/backend/middlewares/auth.middleware.js)
```javascript
import jwt from "jsonwebtoken";
import ExpressError from "../utils/ExpressError.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// 🔐 AUTHENTICATION
export function verifyToken(req, res, next) {
  let token = req.headers.authorization;

  // 1️⃣ No token
  if (!token) {
    throw new ExpressError(401, "No token provided");
  }

  // 2️⃣ Remove Bearer prefix
  if (token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  // 3️⃣ Verify JWT
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      throw new ExpressError(401, "Invalid or expired token");
    }

    // 4️⃣ Attach user info to request
    req.user = decoded;

    next();
  });
}

// 🚦 AUTHORIZATION
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ExpressError(401, "User not authenticated");
    }

    if (req.user.role !== role) {
      throw new ExpressError(403, "Forbidden: insufficient permissions");
    }

    next();
  };
}
```
* **Explanation:**
  - `verifyToken` checks for the presence of the `Authorization` header, strips the optional `Bearer ` prefix, verifies the JWT signature using `JWT_SECRET`, and extracts the decoded payload (`{ id, role, wallet }`) onto the `req.user` object.
  - `requireRole` is a curried middleware factory. It evaluates the user's role and returns an HTTP 403 error if the role does not match the target requirement.
* **Interview Trap:** Look at how token verification is handled: `jwt.verify` uses an asynchronous callback pattern. However, errors are thrown synchronously (`throw new ExpressError`). In Express 5 (used here), synchronous errors are automatically caught. In Express 4, throwing synchronous errors inside an async callback would bypass the global error handler and crash the process.

---

### 4. [backend/controllers/auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js)
```javascript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// --------- SIGNUP ----------
export const signup = async (req, res) => {
  const { name, email, password, role, wallet_address } = req.body;

  if (!name || !email || !password || !role) {
    throw new ExpressError(400, "Missing required fields");
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const sql = `
      INSERT INTO users (name, email, password_hash, role, wallet_address)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db
      .promise()
      .query(sql, [name, email, password_hash, role, wallet_address]);

    const userId = result.insertId;

    if (role === "donor") {
      await db.promise().query(
        "INSERT INTO donor_details (donor_id) VALUES (?)",
        [userId]
      );
    }

    if (role === "ngo") {
      await db.promise().query(
        "INSERT INTO ngo_details (ngo_id) VALUES (?)",
        [userId]
      );
    }

    res.json({ message: "Signup successful", id: userId });

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      throw new ExpressError(400, "Email already exists");
    }
    throw new ExpressError(500, "Database error during signup");
  }
};

// --------- LOGIN ----------
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ExpressError(400, "Missing email or password");
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  const [rows] = await db.promise().query(sql, [email]);

  if (rows.length === 0) {
    throw new ExpressError(400, "User not found");
  }

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new ExpressError(400, "Incorrect password");
  }

  const payload = {
    id: user.id,
    role: user.role,
    wallet: user.wallet_address,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

  res.json({
    message: "Login successful",
    token,
    role: user.role,
    wallet: user.wallet_address,
  });
};
```
* **Explanation:**
  - `signup` processes new user registrations. It hashes the password using `bcrypt` with `10` salt rounds and runs an SQL transaction block inserting profile details into `users` and secondary metrics tables (`donor_details`/`ngo_details`).
  - `login` checks credentials using `bcrypt.compare` and issues a JWT token containing `{ id, role, wallet }` signed with `JWT_SECRET`. It is configured to expire in `1d` (1 day).
* **Interview Trap:** Note the usage of parameterized queries: `db.promise().query(sql, [email])`. Parameterization prevents **SQL Injection** by treating inputs as literal values rather than executable query tokens. If a string like `' OR '1'='1` is supplied, the driver searches for that literal string, rendering SQL injections impossible.

---

### 5. [backend/controllers/donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js)
```javascript
import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";
import { recordDonation } from "../services/donation.service.js";
import { anchorDonation, generateDonationHash } from "../services/blockchain.service.js";

// -------- DONATE --------
export const donate = async (req, res) => {
  let { fundraiser_id, amount, tx_hash } = req.body;
  const donorWallet = req.user.wallet;

  fundraiser_id = parseInt(fundraiser_id);
  amount = parseFloat(amount);

  if (isNaN(fundraiser_id) || isNaN(amount)) {
    throw new ExpressError(400, "Invalid donation data");
  }

  try {
    if (tx_hash) {
      const [existing] = await db.promise().query(
        "SELECT donation_id FROM donations WHERE tx_hash = ?",
        [tx_hash]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "This transaction hash has already been recorded.",
        });
      }
    }

    const { donationId, donatedAt } = await recordDonation({
      fundraiser_id,
      donor_address: donorWallet,
      amount,
      tx_hash,
      payment_method: "crypto",
      payment_reference: "",
      currency: "ETH",
    });

    const donationHash = generateDonationHash({
      donationId,
      fundraiser_id,
      donor_address: donorWallet,
      amount,
      payment_method: "crypto",
      payment_reference: "",
      donatedAt,
    });

    try {
      const { anchorTxHash } = await anchorDonation(donationHash);

      await db.promise().query(
        "UPDATE donations SET anchor_tx_hash = ? WHERE donation_id = ?",
        [anchorTxHash, donationId]
      );
    } catch (bcErr) {
      console.error("Blockchain anchoring failed (MetaMask):", bcErr);
    }

    res.json({
      message: "Donation successful",
      donationId,
    });
  } catch (err) {
    console.error("MetaMask donation controller error:", err);
    throw new ExpressError(500, "Database error during donation: " + err.message);
  }
};

// -------- MY DONATIONS --------
export const myDonations = async (req, res) => {
  try {
    const sql = `
      SELECT d.*, f.title
      FROM donations d
      JOIN fundraisers f ON d.fundraiser_id = f.fundraiser_id
      WHERE d.donor_address = ?
    `;
    const [rows] = await db.promise().query(sql, [req.user.wallet]);

    res.json(rows);
  } catch (err) {
    throw new ExpressError(500, "Database error fetching donations");
  }
};

export const getFundraiserDonations = async (req, res) => {
  const fundraiserId = parseInt(req.params.id);
  if (isNaN(fundraiserId)) {
    throw new ExpressError(400, "Invalid fundraiser ID");
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT d.*, u.name AS donor_name
      FROM donations d
      LEFT JOIN users u ON d.donor_address = u.wallet_address
      WHERE d.fundraiser_id = ?
      ORDER BY d.donated_at DESC`,
      [fundraiserId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching fundraiser donations:", err);
    throw new ExpressError(500, "Database error fetching fundraiser donations");
  }
};
```
* **Explanation:**
  - `donate` processes on-chain cryptocurrency transactions. It checks the database to prevent duplicate processing of the same transaction hash (`tx_hash`).
  - Calls `recordDonation` to save the donation details to the database first.
  - Computes the Keccak256 hash using `generateDonationHash` and calls `anchorDonation` to commit the hash to the `DonationProofRegistry` contract.
  - Updates the database record with the `anchor_tx_hash` once the anchoring transaction is confirmed.
* **Interview Trap:** Note that the anchoring logic is wrapped in an independent `try...catch` block. If the Sepolia network is congested or the transaction fails, the server logs `"Blockchain anchoring failed (MetaMask)"` and returns a successful response to the user. This design prioritizes core payment updates over real-time blockchain writes, allowing the system to continue functioning even if the blockchain layer is down.

---

### 6. [backend/services/donation.service.js](file:///d:/CampusChain/backend/services/donation.service.js)
```javascript
import db from "../db/index.js";

export const recordDonation = async ({
  fundraiser_id,
  donor_address,
  amount,
  tx_hash,
  payment_method,
  payment_reference,
  currency,
}) => {
  const effectiveTxHash = tx_hash || Date.now();

  const donatedAt = new Date();

  const sql = `
      INSERT INTO donations 
      (fundraiser_id, donor_address, amount, tx_hash, payment_method, payment_reference, currency, donated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const [result] = await db.promise().query(sql, [
    fundraiser_id,
    donor_address,
    amount,
    effectiveTxHash,
    payment_method,
    payment_reference,
    currency || "ETH",
    donatedAt,
  ]);

  return { donationId: result.insertId, donatedAt };
};
```
* **Explanation:**
  - Performs the SQL database insert for a donation record.
  - Returns the generated auto-incrementing ID (`donationId`) and the exact timestamp (`donatedAt`).
* **Interview Trap:** Notice that `donatedAt` is initialized as a JavaScript `new Date()` object rather than relying on database-level `DEFAULT CURRENT_TIMESTAMP`. This design ensures that the timestamp matches exactly between the local database record and the values used to compute the on-chain proof hash.

---

### 7. [backend/services/blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js)
```javascript
import { ethers } from "ethers";
import ExpressError from "../utils/ExpressError.js";

let cached = null;

const getEnv = () => {
  const PROOF_REGISTRY_ADDRESS = process.env.PROOF_REGISTRY_ADDRESS;
  const ANCHOR_PRIVATE_KEY = process.env.ANCHOR_PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL;

  const isConfigured = !!(PROOF_REGISTRY_ADDRESS && ANCHOR_PRIVATE_KEY && RPC_URL);

  return { PROOF_REGISTRY_ADDRESS, ANCHOR_PRIVATE_KEY, RPC_URL, isConfigured };
};

const getDonationProofRegistryAbi = () => {
  return [
    {
      inputs: [{ internalType: "bytes32", name: "donationHash", type: "bytes32" }],
      name: "anchorDonation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes32", name: "donationHash", type: "bytes32" }],
      name: "verifyDonation",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
  ];
};

const init = () => {
  if (cached) return cached;

  const env = getEnv();

  if (!env.isConfigured) {
    console.warn("Blockchain anchoring configuration is incomplete in .env. Mocking blockchain anchoring.");
    cached = {
      isMock: true,
      contract: {
        anchorDonation: async (donationHash) => {
          return {
            hash: `0xmock_anchor_tx_${ethers.keccak256(ethers.toUtf8Bytes(donationHash)).slice(2, 34)}`,
            wait: async () => ({
              hash: `0xmock_anchor_tx_${ethers.keccak256(ethers.toUtf8Bytes(donationHash)).slice(2, 34)}`,
              blockNumber: 12345678,
            }),
          };
        },
        verifyDonation: async (donationHash) => {
          return true;
        },
      },
    };
    return cached;
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL);
  const signer = new ethers.Wallet(env.ANCHOR_PRIVATE_KEY, provider);

  const contract = new ethers.Contract(
    env.PROOF_REGISTRY_ADDRESS,
    getDonationProofRegistryAbi(),
    signer
  );

  cached = { isMock: false, provider, signer, contract };
  return cached;
};

const toSolidityUint256 = (v) => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    return BigInt(v);
  }
  return BigInt(v);
};

export const generateDonationHash = ({
  donationId,
  fundraiser_id,
  donor_address,
  amount,
  payment_method,
  payment_reference,
  donatedAt,
}) => {
  if (!donationId || !fundraiser_id || !donor_address) {
    throw new ExpressError(400, "Missing required fields for donation hash");
  }

  let cleanDonorAddress = donor_address;
  if (!ethers.isAddress(cleanDonorAddress)) {
    cleanDonorAddress = ethers.ZeroAddress;
  }

  const tsSeconds = Math.floor(new Date(donatedAt).getTime() / 1000);

  const amountStr = String(amount);
  let amountEncoded;
  if (/^\d+$/.test(amountStr)) {
    amountEncoded = toSolidityUint256(amountStr);
  } else {
    amountEncoded = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes(amountStr)));
  }

  const paymentMethodStr = payment_method ?? "";
  const paymentRefStr = payment_reference ?? "";

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "uint256", // donation_id
      "uint256", // fundraiser_id
      "address", // donor_address
      "uint256", // amount (deterministic representation)
      "string", // payment_method
      "string", // payment_reference
      "uint256", // donated_at timestamp (seconds)
    ],
    [
      BigInt(donationId),
      BigInt(fundraiser_id),
      cleanDonorAddress,
      amountEncoded,
      paymentMethodStr,
      paymentRefStr,
      BigInt(tsSeconds),
    ]
  );

  return ethers.keccak256(encoded);
};

export const verifyDonation = async (donationHash) => {
  const { contract, isMock } = init();

  if (!donationHash || donationHash === ethers.ZeroHash) {
    throw new ExpressError(400, "donationHash must be non-zero bytes32");
  }

  if (isMock) {
    return true;
  }

  const verified = await contract.verifyDonation(donationHash);
  return verified;
};

export const anchorDonation = async (donationHash) => {
  const { contract, isMock } = init();

  if (!donationHash || donationHash === ethers.ZeroHash) {
    throw new ExpressError(400, "donationHash must be non-zero bytes32");
  }

  if (isMock) {
    const mockTx = await contract.anchorDonation(donationHash);
    const mockReceipt = await mockTx.wait();
    return {
      anchorTxHash: mockReceipt.hash,
      blockNumber: mockReceipt.blockNumber,
    };
  }

  const tx = await contract.anchorDonation(donationHash);

  const receipt = await tx.wait();

  return {
    anchorTxHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};
```
* **Explanation:**
  - `init` sets up connection objects. It caches them to avoid instantiating new provider instances on every API request.
  - `generateDonationHash` constructs the cryptographic payload:
    - Normalizes the donor address, defaulting to `0x0000000000000000000000000000000000000000` (zero address) if the wallet is invalid or if the donation was processed via Razorpay.
    - Encodes decimal amounts safely: if it's a float, it hashes the string literal representation of the float to generate a deterministic integer (`BigInt`) to prevent rounding errors.
    - Encodes the parameter types to binary format using `AbiCoder.defaultAbiCoder().encode()`, matching EVM layouts, and applies Keccak256 hashing.
  - `anchorDonation` sends the signed transaction to write the hash to `DonationProofRegistry`. It waits for 1 confirmation using `await tx.wait()`.
* **Interview Trap:** Note the address validation logic: `ethers.isAddress(cleanDonorAddress)`. This prevents transaction reverts when users sign up using physical mailing addresses instead of valid hex wallets. The fallback defaults to `ZeroAddress`, allowing off-chain Razorpay donations to anchor successfully.

---

### 8. [backend/controllers/payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js)
```javascript
import Razorpay from "razorpay";
import ExpressError from "../utils/ExpressError.js";
import db from "../db/index.js";
import { recordDonation } from "../services/donation.service.js";
import {
  anchorDonation,
  generateDonationHash,
} from "../services/blockchain.service.js";

const getRazorpayClient = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new ExpressError(
      500,
      "Razorpay is not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET."
    );
  }

  return new Razorpay({ key_id, key_secret });
};

const verifyRazorpaySignature = async ({ razorpay_order_id, razorpay_payment_id }, razorpay_signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new ExpressError(
      500,
      "Razorpay is not configured. Missing RAZORPAY_KEY_SECRET."
    );
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return { expected };
};

export const verifyPayment = async (req, res) => {
  const {
    fundraiser_id,
    amount,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ExpressError(400, "Missing razorpay fields.");
  }

  if (fundraiser_id == null || amount == null) {
    throw new ExpressError(400, "Missing fundraiser_id or amount.");
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new ExpressError(500, "Razorpay is not configured. Missing RAZORPAY_KEY_SECRET.");
  }

  const { expected } = await verifyRazorpaySignature(
    { razorpay_order_id, razorpay_payment_id },
    razorpay_signature
  );

  if (expected !== razorpay_signature) {
    return res.status(401).json({
      success: false,
      verified: false,
      message: "Invalid Razorpay signature.",
    });
  }

  try {
    const [existing] = await db.promise().query(
      "SELECT donation_id FROM donations WHERE payment_reference = ?",
      [razorpay_payment_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been recorded.",
      });
    }

    const {
      donationId,
      donatedAt,
    } = await recordDonation({
      fundraiser_id,
      donor_address: req.user.wallet,
      amount,
      tx_hash: null,
      payment_method: "razorpay",
      payment_reference: razorpay_payment_id,
      currency: "INR",
    });

    const donationHash = generateDonationHash({
      donationId,
      fundraiser_id,
      donor_address: req.user.wallet,
      amount,
      payment_method: "razorpay",
      payment_reference: razorpay_payment_id,
      donatedAt,
    });

    try {
      const { anchorTxHash } = await anchorDonation(donationHash);

      await db.promise().query(
        "UPDATE donations SET anchor_tx_hash = ? WHERE donation_id = ?",
        [anchorTxHash, donationId]
      );
    } catch (bcErr) {
      console.error("Blockchain anchoring failed (Razorpay):", bcErr);
    }

    return res.json({
      success: true,
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      donationId,
    });
  } catch (err) {
    console.error("Razorpay verification database error:", err);
    throw new ExpressError(500, "Database error during Razorpay donation recording: " + err.message);
  }
};

export const createOrder = async (req, res) => {
  const { amount, fundraiser_id } = req.body;

  const parsedFundraiserId = Number(fundraiser_id);
  const parsedAmount = Number(amount);

  if (!Number.isInteger(parsedFundraiserId) || parsedFundraiserId <= 0) {
    throw new ExpressError(400, "Invalid fundraiser_id.");
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new ExpressError(400, "Invalid amount.");
  }

  const currency = (process.env.RAZORPAY_CURRENCY || "INR").toUpperCase();

  const paiseAmount = Math.round(parsedAmount * 100);

  if (paiseAmount <= 0) {
    throw new ExpressError(400, "Amount is too small to create an order.");
  }

  try {
    const razorpay = getRazorpayClient();

    const receipt = `campuschain_${parsedFundraiserId}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: paiseAmount,
      currency,
      receipt,
      notes: {
        fundraiser_id: String(parsedFundraiserId),
      },
    });

    return res.status(201).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    throw new ExpressError(
      err.status || 500,
      err.message || "Failed to create order with Razorpay."
    );
  }
};
```
* **Explanation:**
  - `createOrder` calls Razorpay's API to construct a new order. It rounds values to integers (`Math.round(parsedAmount * 100)`) because payment gateways handle transactions in the smallest currency unit (paise for INR).
  - `verifyPayment` validates signatures. It re-computes `HMAC-SHA256` of `order_id + '|' + payment_id` using the server's private secret and compares the result to `razorpay_signature`.
  - On signature match, the payment record is saved in SQL and mapped in `DonationProofRegistry`.
* **Interview Trap:** Note the signature check. It uses the `===` operator for comparison. In high-security systems, this can be vulnerable to **Timing Attacks** because the comparison exits early on mismatch. The recommended fix is to use `crypto.timingSafeEqual()` to guarantee constant-time execution.

---

### 9. Routes Files (`backend/routes/*.js`)

#### A. [backend/routes/auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js)
```javascript
import express from "express";
import { signup, login } from "../controllers/auth.controller.js";
import wrapAsync from "../utils/wrapAsync.js";

const router = express.Router();

router.post("/signup", wrapAsync(signup));
router.post("/login", wrapAsync(login));

export default router;
```
* **Enforced Controls:** These endpoints are public (no authentication middlewares). `wrapAsync` catches any rejected promises inside controllers, sending them to the global error middleware handler.

#### B. [backend/routes/donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js)
```javascript
import express from "express";
import { donate, myDonations, getFundraiserDonations } from "../controllers/donation.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/api/donate", verifyToken, requireRole("donor"), donate);
router.get("/api/my-donations", verifyToken, requireRole("donor"), myDonations);
router.get("/api/fundraiser/:id/donations", verifyToken, getFundraiserDonations);

export default router;
```
* **Enforced Controls:**
  - `POST /api/donate` and `GET /api/my-donations` are guarded by `verifyToken` (authenticates session) and `requireRole("donor")` (restricts actions to the donor role).
  - `GET /api/fundraiser/:id/donations` requires token verification but allows both roles (NGOs and donors) to read lists of donations.

#### C. [backend/routes/payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js)
```javascript
import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/api/razorpay/create-order",
  verifyToken,
  requireRole("donor"),
  createOrder
);

router.post(
  "/api/razorpay/verify",
  verifyToken,
  requireRole("donor"),
  verifyPayment
);

export default router;
```
* **Enforced Controls:** Both endpoints are locked to authenticated donors (`requireRole("donor")`).

#### D. [backend/routes/donationVerification.routes.js](file:///d:/CampusChain/backend/routes/donationVerification.routes.js)
```javascript
import express from "express";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";
import { verifyDonationProof } from "../controllers/donationVerification.controller.js";

const router = express.Router();

router.get(
  "/api/donation/:donationId/verify",
  verifyToken,
  requireRole("donor"),
  verifyDonationProof
);

export default router;
```
* **Enforced Controls:** Guarded by `verifyToken` and `requireRole("donor")`. The endpoint limits queries to authenticated donors.

---

### 10. [contract.sol](file:///d:/CampusChain/contract.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CampusChainCrowdfunding {

    // ---------------- STRUCTS ----------------

    struct Fundraiser {
        uint256 id;
        address payable owner;     // Club / NGO / Student organizer
        string title;              // Fundraiser title
        string description;        // Description of the campus initiative
        uint256 goal;              // Fundraising goal in wei
        uint256 raised;            // Total funds raised
        bool active;               // Whether fundraiser is active
    }

    struct Donation {
        address donor;             // Student / Alumni donor
        uint256 amount;            // Amount donated
        uint256 timestamp;         // Time of donation
    }

    // ---------------- STATE VARIABLES ----------------

    uint256 public fundraiserCount;

    mapping(uint256 => Fundraiser) public fundraisers;

    mapping(uint256 => Donation[]) public donations;

    // ---------------- EVENTS ----------------

    event FundraiserCreated(
        uint256 indexed fundraiserId,
        address indexed owner,
        string title,
        uint256 goal
    );

    event DonationMade(
        uint256 indexed fundraiserId,
        address indexed donor,
        uint256 amount
    );

    event FundraiserClosed(uint256 indexed fundraiserId);

    // ---------------- MODIFIERS ----------------

    modifier fundraiserExists(uint256 _id) {
        require(_id < fundraiserCount, "Fundraiser does not exist");
        _;
    }

    modifier onlyOwner(uint256 _id) {
        require(msg.sender == fundraisers[_id].owner, "Not fundraiser owner");
        _;
    }

    // ---------------- FUNCTIONS ----------------

    function createFundraiser(
        string calldata _title,
        string calldata _description,
        uint256 _goal
    ) external {
        require(_goal > 0, "Goal must be greater than zero");

        fundraisers[fundraiserCount] = Fundraiser({
            id: fundraiserCount,
            owner: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            raised: 0,
            active: true
        });

        emit FundraiserCreated(
            fundraiserCount,
            msg.sender,
            _title,
            _goal
        );

        fundraiserCount++;
    }

    function donate(uint256 _fundraiserId)
        external
        payable
        fundraiserExists(_fundraiserId)
    {
        Fundraiser storage fundraiser = fundraisers[_fundraiserId];

        require(fundraiser.active, "Fundraiser is not active");
        require(msg.value > 0, "Donation must be greater than zero");

        fundraiser.raised += msg.value;

        donations[_fundraiserId].push(
            Donation({
                donor: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        fundraiser.owner.transfer(msg.value);

        emit DonationMade(_fundraiserId, msg.sender, msg.value);

        if (fundraiser.raised >= fundraiser.goal) {
            fundraiser.active = false;
            emit FundraiserClosed(_fundraiserId);
        }
    }

    function getDonations(uint256 _fundraiserId)
        external
        view
        fundraiserExists(_fundraiserId)
        returns (Donation[] memory)
    {
        return donations[_fundraiserId];
    }

    function closeFundraiser(uint256 _fundraiserId)
        external
        fundraiserExists(_fundraiserId)
        onlyOwner(_fundraiserId)
    {
        fundraisers[_fundraiserId].active = false;
        emit FundraiserClosed(_fundraiserId);
    }

    function getFundraiser(uint256 _fundraiserId)
        external
        view
        fundraiserExists(_fundraiserId)
        returns (
            uint256 id,
            address owner,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 raised,
            bool active
        )
    {
        Fundraiser memory f = fundraisers[_fundraiserId];
        return (
            f.id,
            f.owner,
            f.title,
            f.description,
            f.goal,
            f.raised,
            f.active
        );
    }
}
```
* **Explanation:**
  - `createFundraiser` writes a new `Fundraiser` struct to EVM storage.
  - `donate` processes ETH transfers:
    - Increments on-chain totals.
    - Calls `fundraiser.owner.transfer(msg.value)` to forward funds directly to the campaign owner's address.
    - Closes the campaign automatically if the goal is met.
* **Interview Trap:** Note the line: `fundraiser.owner.transfer(msg.value);`. The `.transfer()` method is limited to forwarding `2300` gas. This limits the receiver's gas consumption, preventing reentrancy attacks. However, it is an anti-pattern in modern Solidity because if the receiving address is a smart contract (e.g. multi-sig or proxy), its fallback execution might consume more than 2300 gas, causing the transaction to fail and preventing the owner from receiving donations.

---

### 11. [DonationProofRegistry.sol](file:///d:/CampusChain/DonationProofRegistry.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DonationProofRegistry {

    struct Proof {
        uint256 timestamp;      // When the proof was anchored
        address anchoredBy;     // Who anchored it
    }

    // donationHash => Proof
    mapping(bytes32 => Proof) private proofs;

    event DonationAnchored(
        bytes32 indexed donationHash,
        address indexed anchoredBy,
        uint256 timestamp
    );

    function anchorDonation(bytes32 donationHash) external {

        require(
            donationHash != bytes32(0),
            "Invalid donation hash"
        );

        require(
            proofs[donationHash].timestamp == 0,
            "Donation already anchored"
        );

        proofs[donationHash] = Proof({
            timestamp: block.timestamp,
            anchoredBy: msg.sender
        });

        emit DonationAnchored(
            donationHash,
            msg.sender,
            block.timestamp
        );
    }

    function verifyDonation(bytes32 donationHash)
        external
        view
        returns (bool)
    {
        return proofs[donationHash].timestamp != 0;
    }

    function getProof(bytes32 donationHash)
        external
        view
        returns (
            uint256 timestamp,
            address anchoredBy
        )
    {
        Proof memory proof = proofs[donationHash];

        require(
            proof.timestamp != 0,
            "Proof not found"
        );

        return (
            proof.timestamp,
            proof.anchoredBy
        );
    }
}
```
* **Explanation:**
  - `anchorDonation` writes a 32-byte cryptographic hash to storage. It registers the sender (`anchoredBy`) and block timestamp, and asserts that the hash has not been anchored before to prevent replay submissions.
  - `verifyDonation` checks the mapping and returns a boolean value indicating whether the hash has been anchored.
* **Interview Trap:** Note that `anchorDonation` does not restrict access (any address can call it). However, it records `msg.sender` in `proofs[donationHash].anchoredBy`. The off-chain system verifies that this matches the backend's known public key to establish trust.

---

### 12. [frontend/fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js) (Donation Click Handlers)

#### MetaMask Donation Method
```javascript
async function donateEth() {
  const amountInput = document.getElementById("ethAmount");
  const amount = amountInput.value.trim();
  const donateEthBtn = document.getElementById("donateEthBtn");

  if (!userAccount) return alert("Please connect MetaMask first!");
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return alert("Enter valid ETH amount");

  const token = localStorage.getItem("token");
  if (!token) return alert("Please login to record your donation.");

  const msgEl = document.getElementById("donationMsg");
  donateEthBtn.disabled = true;
  const originalText = donateEthBtn.innerText;
  donateEthBtn.innerText = "Processing MetaMask Payment...";
  msgEl.className = "pending show";
  msgEl.innerHTML = "Confirming MetaMask transaction... Please check your wallet.";

  try {
    const tx = await contract.methods.donate(fundraiserId).send({
      from: userAccount,
      value: web3.utils.toWei(amount.toString(), "ether"),
    });

    msgEl.innerHTML = "Transaction confirmed on-chain! Registering donation record on backend...";

    const res = await fetch(`${API_BASE}/api/donate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        fundraiser_id: fundraiserId,
        amount: parseFloat(amount),
        tx_hash: tx.transactionHash,
        payment_method: "crypto",
        payment_reference: null,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to record donation on backend.");
    }

    msgEl.className = "success show";
    msgEl.innerHTML = `
      Donation successful! 🚀 <br>
      <a href="https://sepolia.etherscan.io/tx/${tx.transactionHash}" target="_blank" style="color: #15803d; text-decoration: underline; font-weight: 700;">
        View on Etherscan
      </a>
    `;
    amountInput.value = "";

    loadFundraiser();
    loadComments();
  } catch (err) {
    console.error("Donation error:", err);
    msgEl.className = "error show";
    msgEl.innerHTML = `❌ Donation failed: ${err.message || "Transaction failed or rejected."}`;
  } finally {
    donateEthBtn.disabled = false;
    donateEthBtn.innerText = originalText;
  }
}
```
* **Explanation:**
  - Instantiates Web3 and calls `contract.methods.donate(fundraiserId).send()` to send the transaction through MetaMask.
  - Converts decimal inputs to wei values: `web3.utils.toWei(amount.toString(), "ether")`.
  - Triggers a REST call to `POST /api/donate` with the transaction hash to save details to the database once the transaction is mined.
* **Interview Trap:** Note the authentication header format: `Authorization: token` (without the `Bearer ` prefix). The backend middleware handles this by checking if the header starts with "Bearer " before stripping the prefix, ensuring compatibility with both formats.

#### Razorpay Donation Method
```javascript
async function donateRazorpay() {
  const amountInput = document.getElementById("inrAmount");
  const amount = amountInput.value.trim();
  const donateRazorpayBtn = document.getElementById("donateRazorpayBtn");
  const msgEl = document.getElementById("donationMsg");

  const token = localStorage.getItem("token");
  if (!token) return alert("Please login to donate.");
  if (!fundraiserId) return alert("Fundraiser id missing from URL.");
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return alert("Enter valid donation amount.");

  donateRazorpayBtn.disabled = true;
  const originalText = donateRazorpayBtn.innerText;
  donateRazorpayBtn.innerText = "Initializing Razorpay...";
  msgEl.className = "pending show";
  msgEl.innerHTML = "Loading payment SDK and initializing order transaction...";

  try {
    await loadRazorpayCheckoutSdk();

    const res = await fetch(`${API_BASE}/api/razorpay/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fundraiser_id: fundraiserId, amount: parseFloat(amount) }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create Razorpay order (${res.status}).`);
    }

    const order = await res.json();

    donateRazorpayBtn.disabled = false;
    donateRazorpayBtn.innerText = originalText;
    msgEl.innerHTML = "Checkout modal open. Please complete the payment steps.";

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "CampusChain",
      description: "Donation",
      order_id: order.order_id,
      handler: async function (response) {
        donateRazorpayBtn.disabled = true;
        donateRazorpayBtn.innerText = "Verifying payment...";
        msgEl.className = "pending show";
        msgEl.innerHTML = "Verifying payment signature with the backend...";

        try {
          const payload = {
            fundraiser_id: fundraiserId,
            amount: parseFloat(amount),
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          const verifyRes = await fetch(`${API_BASE}/api/razorpay/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!verifyRes.ok) {
            const verifyErr = await verifyRes.json().catch(() => ({}));
            throw new Error(verifyErr.message || "Payment verification failed.");
          }

          msgEl.className = "success show";
          msgEl.innerHTML = `
            Donation successful! 🚀 <br>
            Payment ID: <strong>${response.razorpay_payment_id}</strong>
          `;
          amountInput.value = "";

          loadFundraiser();
          loadComments();
        } catch (e) {
          console.error("Razorpay verification failed:", e);
          msgEl.className = "error show";
          msgEl.innerHTML = `❌ Payment verification failed: ${e.message || "Verification server error."}`;
        } finally {
          donateRazorpayBtn.disabled = false;
          donateRazorpayBtn.innerText = originalText;
        }
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay popup dismissed");
          msgEl.className = "error show";
          msgEl.innerHTML = "❌ Payment cancelled or modal closed.";
          donateRazorpayBtn.disabled = false;
          donateRazorpayBtn.innerText = originalText;
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("Razorpay donation error:", err);
    msgEl.className = "error show";
    msgEl.innerHTML = `❌ Razorpay payment failed: ${err.message || "Initialization error."}`;
    donateRazorpayBtn.disabled = false;
    donateRazorpayBtn.innerText = originalText;
  }
}
```
* **Explanation:**
  - Calls `POST /api/razorpay/create-order` to retrieve `order_id` and the client key configuration.
  - Instantiates `window.Razorpay` with config parameters and a handler callback, and displays the modal using `rzp.open()`.
  - Captures payment parameters on success and forwards them to `POST /api/razorpay/verify` to verify the signature on the backend.
* **Interview Trap:** Note the usage of `Authorization: 'Bearer ' + token` in the headers. Ensure you can explain why the Bearer prefix is used in this client call while being omitted in the MetaMask client call.

---

### 13. [frontend/contractConfig.js](file:///d:/CampusChain/frontend/contractConfig.js)
```javascript
window.CONTRACT_ADDRESS = "0x4bd64A1f096c7eaBbeC73886CDD9Fb8c672036dc";

window.CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" }
    ],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
  // (Full standard ABI mapping continues in source file)
];
```
* **Explanation:**
  - Saves the deployed contract address and ABI array as properties on the global `window` object, making them accessible to any script running in the browser.

---

### 14. Client Auth Handlers ([frontend/login.js](file:///d:/CampusChain/frontend/login.js))
```javascript
    // Save token + role + wallet
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("wallet", data.wallet);
```
* **Explanation:**
  - Client-side auth details are saved in `localStorage` inside the login submission function.
  - The saved token is accessed in subsequent client requests using `localStorage.getItem("token")`.

---

## 3. Frontend-Backend Connection Summary

### API Configuration
The API base URL is resolved dynamically in [api.js](file:///d:/CampusChain/frontend/config/api.js#L4-L8):
```javascript
const API_BASE =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
  window.location.protocol === "file:"
    ? "http://localhost:5000"
    : "https://campuschain.online";
```

### Endpoints and Payloads

| URL Endpoint | HTTP Method | Expected Payload | Auth Header Requirement |
|---|---|---|---|
| `/login` | `POST` | `{ email, password }` | None |
| `/signup` | `POST` | `{ name, email, password, role, wallet_address }` | None |
| `/api/donate` | `POST` | `{ fundraiser_id, amount, tx_hash, payment_method, payment_reference }` | Yes (`Authorization: token`) |
| `/api/razorpay/create-order` | `POST` | `{ fundraiser_id, amount }` | Yes (`Authorization: Bearer token`) |
| `/api/razorpay/verify` | `POST` | `{ fundraiser_id, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | Yes (`Authorization: Bearer token`) |
| `/api/donation/:donationId/verify` | `GET` | None | Yes (`Authorization: Bearer token`) |

### CORS Setup
Cross-Origin Resource Sharing (CORS) is enabled globally in the Express configuration in [app.js](file:///d:/CampusChain/backend/app.js#L40):
```javascript
app.use(cors());
```
* **Explanation:** Calling `cors()` without options allows requests from any origin domain, which simplifies testing during development. In a production environment, this should be restricted to the specific frontend domain (e.g., `https://campuschain07.netlify.app`) to prevent unauthorized cross-origin requests.

---

## 4. Full Request Traces

### Trace A: MetaMask Donation (`POST /api/donate`)
1. **Frontend Dispatch:**
   `await fetch(`${API_BASE}/api/donate`, { method: "POST", body: JSON.stringify(...) })` ([fundraiser-detail.js:L249](file:///d:/CampusChain/frontend/fundraiser-detail.js#L249))
2. **Router Handling:**
   `router.post("/api/donate", verifyToken, requireRole("donor"), donate);` ([donation.routes.js:L13](file:///d:/CampusChain/backend/routes/donation.routes.js#L13))
3. **Authentication Middleware:**
   `jwt.verify(token, JWT_SECRET, (err, decoded) => { ... })` ([auth.middleware.js:L24](file:///d:/CampusChain/backend/middlewares/auth.middleware.js#L24))
4. **Role Middleware Validation:**
   `if (req.user.role !== role) { ... }` ([auth.middleware.js:L43](file:///d:/CampusChain/backend/middlewares/auth.middleware.js#L43))
5. **Controller Routing:**
   `export const donate = async (req, res) => { ... }` ([donation.controller.js:L7](file:///d:/CampusChain/backend/controllers/donation.controller.js#L7))
6. **SQL Database Insert:**
   `const [result] = await db.promise().query(sql, [ ... ]);` ([donation.service.js:L33](file:///d:/CampusChain/backend/services/donation.service.js#L33))
7. **Proof Hash Generation:**
   `const encoded = ethers.AbiCoder.defaultAbiCoder().encode([ ... ]);` ([blockchain.service.js:L135](file:///d:/CampusChain/backend/services/blockchain.service.js#L135))
8. **On-Chain Anchor Transaction:**
   `const tx = await contract.anchorDonation(donationHash);` ([blockchain.service.js:L194](file:///d:/CampusChain/backend/services/blockchain.service.js#L194))
9. **Receipt Confirmation:**
   `const receipt = await tx.wait();` ([blockchain.service.js:L197](file:///d:/CampusChain/backend/services/blockchain.service.js#L197))
10. **SQL Record Update:**
    `await db.promise().query("UPDATE donations SET anchor_tx_hash = ? WHERE ...", [anchorTxHash, donationId]);` ([donation.controller.js:L59](file:///d:/CampusChain/backend/controllers/donation.controller.js#L59))
11. **HTTP JSON Response:**
    `res.json({ message: "Donation successful", donationId });` ([donation.controller.js:L68](file:///d:/CampusChain/backend/controllers/donation.controller.js#L68))

### Trace B: Razorpay Verification (`POST /api/razorpay/verify`)
1. **Frontend Dispatch:**
   `await fetch(`${API_BASE}/api/razorpay/verify`, { method: "POST", body: JSON.stringify(payload) })` ([fundraiser-detail.js:L383](file:///d:/CampusChain/frontend/fundraiser-detail.js#L383))
2. **Router Handling:**
   `router.post("/api/razorpay/verify", verifyToken, requireRole("donor"), verifyPayment);` ([payment.routes.js:L19-L24](file:///d:/CampusChain/backend/routes/payment.routes.js#L19-L24))
3. **Session Authentication:**
   `verifyToken` and `requireRole` middleware checks pass.
4. **Signature Match Verification:**
   `const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");` ([payment.controller.js:L50](file:///d:/CampusChain/backend/controllers/payment.controller.js#L50))
5. **Database Duplicate Check:**
   `const [existing] = await db.promise().query("SELECT donation_id FROM donations WHERE payment_reference = ?", [razorpay_payment_id]);` ([payment.controller.js:L103](file:///d:/CampusChain/backend/controllers/payment.controller.js#L103))
6. **SQL Database Record Insert:**
   `const { donationId, donatedAt } = await recordDonation({ ... });` ([payment.controller.js:L115](file:///d:/CampusChain/backend/controllers/payment.controller.js#L115))
7. **Verification Hash Generation:**
   `const donationHash = generateDonationHash({ ... });` ([payment.controller.js:L129](file:///d:/CampusChain/backend/controllers/payment.controller.js#L129))
8. **On-Chain Anchor Transaction:**
   `const { anchorTxHash } = await anchorDonation(donationHash);` ([payment.controller.js:L141](file:///d:/CampusChain/backend/controllers/payment.controller.js#L141))
9. **Update Database Record:**
   `await db.promise().query("UPDATE donations SET anchor_tx_hash = ? WHERE ...", [anchorTxHash, donationId]);` ([payment.controller.js:L144](file:///d:/CampusChain/backend/controllers/payment.controller.js#L144))
10. **HTTP Response:**
    `return res.json({ success: true, verified: true, payment_id: ... });` ([payment.controller.js:L152](file:///d:/CampusChain/backend/controllers/payment.controller.js#L152))

### Trace C: User Authentication Login (`POST /api/auth/login`)
1. **Frontend Dispatch:**
   `const res = await fetch(`${API_BASE}/login`, { method: "POST", body: JSON.stringify({ email, password }) })` ([login.js:L53](file:///d:/CampusChain/frontend/login.js#L53))
2. **Router Handling:**
   `router.post("/login", wrapAsync(login));` ([auth.routes.js:L17](file:///d:/CampusChain/backend/routes/auth.routes.js#L17))
3. **Database Profile Lookup:**
   `const [rows] = await db.promise().query(sql, [email]);` ([auth.controller.js:L67](file:///d:/CampusChain/backend/controllers/auth.controller.js#L67))
4. **Password Validation Match:**
   `const match = await bcrypt.compare(password, user.password_hash);` ([auth.controller.js:L75](file:///d:/CampusChain/backend/controllers/auth.controller.js#L75))
5. **Token Generation:**
   `const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });` ([auth.controller.js:L88](file:///d:/CampusChain/backend/controllers/auth.controller.js#L88))
6. **HTTP Response:**
   `res.json({ message: "Login successful", token, role: user.role, wallet: ... });` ([auth.controller.js:L90](file:///d:/CampusChain/backend/controllers/auth.controller.js#L90))

---

## 5. Technical Concepts Glossary

### 1. **Connection Pooling**
* **Definition:** A cache of database connections kept open so that connections can be reused for subsequent queries, reducing the overhead of opening a new connection for every request.
* **Implementation:** Configured in `backend/db/index.js` using `mysql.createPool({...})` ([db/index.js:L15](file:///d:/CampusChain/backend/db/index.js#L15)).

### 2. **JSON Web Token (JWT) Session Signing**
* **Definition:** Generating a cryptographically signed JSON object to securely transmit session information (such as user ID and role) between the client and server.
* **Implementation:** Performed during login using `jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" })` ([auth.controller.js:L88](file:///d:/CampusChain/backend/controllers/auth.controller.js#L88)).

### 3. **Parameterized Queries**
* **Definition:** A database query where parameters are passed separately from the SQL statement template. This prevents SQL injection attacks because input parameters are treated strictly as data rather than executable code.
* **Implementation:** Used in the database lookup query: `db.promise().query(sql, [email])` ([auth.controller.js:L67](file:///d:/CampusChain/backend/controllers/auth.controller.js#L67)).

### 4. **Middleware Chaining**
* **Definition:** Passing control sequentially through a series of middleware functions in Express to validate, parse, or filter incoming HTTP requests before they reach the controller.
* **Implementation:** Implemented on the payment route: `verifyToken, requireRole("donor"), createOrder` ([payment.routes.js:L13-L15](file:///d:/CampusChain/backend/routes/payment.routes.js#L13-L15)).

### 5. **HMAC-SHA256 Signature Verification**
* **Definition:** Creating a keyed-hash message authentication code (HMAC) to verify the authenticity and integrity of a message using a shared secret key.
* **Implementation:** Used to verify Razorpay signatures by computing the HMAC-SHA256 signature of the order and payment ID: `crypto.createHmac("sha256", secret).update(payload).digest("hex")` ([payment.controller.js:L50](file:///d:/CampusChain/backend/controllers/payment.controller.js#L50)).

### 6. **Keccak256 Cryptographic Hashing**
* **Definition:** A cryptographic hash function used in Ethereum to generate unique, fixed-size 32-byte digests of arbitrary data.
* **Implementation:** Used to compute the donation hash before anchoring: `ethers.keccak256(encoded)` ([blockchain.service.js:L156](file:///d:/CampusChain/backend/services/blockchain.service.js#L156)).

### 7. **ABI Encoding**
* **Definition:** Encoding parameter values into binary format according to the Ethereum Application Binary Interface (ABI) specification, allowing smart contracts to parse input parameters correctly.
* **Implementation:** Performed before hashing donation parameters: `ethers.AbiCoder.defaultAbiCoder().encode([...])` ([blockchain.service.js:L135](file:///d:/CampusChain/backend/services/blockchain.service.js#L135)).

### 8. **View Calls vs. Transaction Broadcasts**
* **Definition:** View calls are read-only operations executed locally against a blockchain node without state changes or gas costs. Transaction broadcasts are write operations signed by a wallet and sent to the network to modify contract state, incurring gas fees.
* **Implementation:** Read verification `contract.verifyDonation(donationHash)` ([blockchain.service.js:L171](file:///d:/CampusChain/backend/services/blockchain.service.js#L171)) vs. write anchoring `contract.anchorDonation(donationHash)` ([blockchain.service.js:L194](file:///d:/CampusChain/backend/services/blockchain.service.js#L194)).

### 9. **Asynchronous Nonce Management**
* **Definition:** Managing transaction sequences (nonces) associated with a wallet address to ensure transactions are processed in the correct order without collision errors.
* **Implementation:** Managed internally by the `ethers` library when the backend wallet calls `contract.anchorDonation(donationHash)` ([blockchain.service.js:L194](file:///d:/CampusChain/backend/services/blockchain.service.js#L194)).

### 10. **Reentrancy Mitigation**
* **Definition:** A security pattern in Solidity designed to prevent reentrant contract calls from draining funds before state changes (e.g. balance updates) are written.
* **Implementation:** Enforced in `contract.sol` using `.transfer()` to send funds, which limits the receiver's gas stipend to `2300` gas and prevents reentrant calls: `fundraiser.owner.transfer(msg.value)` ([contract.sol:L130](file:///d:/CampusChain/contract.sol#L130)).

### 11. **Etherscan Verification Link**
* **Definition:** Generating a URL with the transaction hash to link users directly to a blockchain explorer where they can independently verify transaction details on-chain.
* **Implementation:** Generated dynamically in the UI on success: `href="https://sepolia.etherscan.io/tx/${tx.transactionHash}"` ([fundraiser-detail.js:L272](file:///d:/CampusChain/frontend/fundraiser-detail.js#L272)).

### 12. **Idempotency Verification**
* **Definition:** A design pattern that ensures an operation behaves identically and does not cause side effects (like duplicate database entries) if executed multiple times with the same parameters.
* **Implementation:** Enforced in the payment verify controller by checking if the Razorpay payment ID has already been recorded in the database: `SELECT donation_id FROM donations WHERE payment_reference = ?` ([payment.controller.js:L103-L104](file:///d:/CampusChain/backend/controllers/payment.controller.js#L103-L104)).

### 13. **Local Time Drift Handling**
* **Definition:** Parsing database timestamps in UTC (`timezone: "Z"`) rather than local time to prevent time drift issues when synchronizing database timestamps with block timestamps on the blockchain.
* **Implementation:** Enforced on the database connection pool configuration: `timezone: "Z"` ([db/index.js:L21](file:///d:/CampusChain/backend/db/index.js#L21)).

### 14. **Curried Middleware Factory**
* **Definition:** A higher-order function that takes configuration parameters (like a target user role) and returns a standard Express middleware function to evaluate requests.
* **Implementation:** Used to implement role validation: `requireRole(role)` ([auth.middleware.js:L37](file:///d:/CampusChain/backend/middlewares/auth.middleware.js#L37)).

---
