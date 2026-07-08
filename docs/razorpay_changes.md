# CampusChain v2 - Razorpay Production Integration Changes

This document records the modifications made to make the Razorpay donation integration production-ready.

## 1. Root Cause of the 500 Internal Server Error
*   **The Issue:** When triggering a Razorpay donation, the server returned `500 Internal Server Error`.
*   **The Cause:** In `backend/.env`, the values of `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` were incorrectly set.
    *   `RAZORPAY_KEY_ID` was set to the literal string value `"key_id,key_secret"`.
    *   `RAZORPAY_KEY_SECRET` was set to the combined comma-separated string `"rzp_test_T5aRDXMRRD8fRQ,0nz6sdx1IRgMv7Zox9g3XtOB"`.
    *   This caused the Razorpay SDK client initialization to fail authentication, leading to unhandled API rejections and standard Express 500 error responses on order creation.
*   **The Fix:** Split and correctly set the environment variable values:
    *   `RAZORPAY_KEY_ID=rzp_test_T5aRDXMRRD8fRQ`
    *   `RAZORPAY_KEY_SECRET=0nz6sdx1IRgMv7Zox9g3XtOB`

---

## 2. Every File Modified and Why

### Backend

#### 1. [.env](file:///d:/CampusChain/backend/.env)
*   **Why:** Fixed the swapped/incorrect credentials for the Razorpay API credentials.

#### 2. [donation.service.js](file:///d:/CampusChain/backend/services/donation.service.js)
*   **Why:** Updated the `recordDonation` service to accept a `currency` parameter and write it to the database, ensuring we distinguish between `ETH` and `INR` amounts.

#### 3. [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js)
*   **Why:** Added idempotency protection checking for MetaMask (`crypto`) transactions using `tx_hash` to block double processing, and supplied `currency: "ETH"` when recording transactions.

#### 4. [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js)
*   **Why:** 
    *   In `verifyPayment`, added a database lookup to prevent processing duplicate `razorpay_payment_id` values.
    *   Supplied `currency: "INR"` when writing Razorpay payments.
    *   Wrapped Razorpay SDK calls in `try...catch` with detailed log statements for quick debugging.

#### 5. [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js)
*   **Why:** Modified `getAllFundraisers`, `getFundraiserById`, and `getTotalRaised` queries to handle dynamic currency conversion from `INR` to `ETH` using a fixed rate of `1 ETH = 300,000 INR`.

#### 6. [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js)
*   **Why:** Sanitized the `donor_address` input to fall back to `ethers.ZeroAddress` if the user's registered wallet is an invalid EVM address (e.g. a physical mailing address like "#1238 sector 15 panchkula"), preventing ABI encoding crashes in `generateDonationHash`.

### Frontend

#### 7. [fundraiser-detail.html](file:///d:/CampusChain/frontend/fundraiser-detail.html)
*   **Why:** Redesigned the donation UI by creating two distinct columns (`crypto` and `fiat`) with independent input fields (`ethAmount` and `inrAmount`) to resolve the layout confusion.

#### 8. [fundraiser-detail.js](file:///d:/CampusChain/frontend/fundraiser-detail.js)
*   **Why:**
    *   Updated the payment functions to capture values from their respective independent inputs.
    *   Added loading states to disable buttons and update label text while payment is processing.
    *   Wired clear UI feedback messages and reset form inputs upon successful verification.

---

## 3. SQL Changes (Schema Migration)
*   **Donations Currency:** Added `currency` column to the `donations` table to persist the payment currency (`ETH` or `INR`).
    ```sql
    ALTER TABLE donations ADD COLUMN currency VARCHAR(10) DEFAULT 'ETH';
    UPDATE donations SET currency = 'INR' WHERE payment_method = 'razorpay';
    ```
*   **Comments Table (Missing):** Created the missing `comments` table to resolve fetching and posting failures:
    ```sql
    CREATE TABLE IF NOT EXISTS comments (
      comment_id INT AUTO_INCREMENT PRIMARY KEY,
      fundraiser_id BIGINT NOT NULL,
      user_id INT NOT NULL,
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fundraiser_id) REFERENCES fundraisers(fundraiser_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ```

---

## 4. Architecture Diagrams

### Architecture Before
```
MetaMask Flow
  [Amount Input] ──> [Donate with MetaMask] ──> Sign Tx ──> [Save to DB (Amount as raw)] ──> Anchor Proof

Razorpay Flow (Broken)
  [Amount Input] ──> [Donate with Razorpay] ──> [create-order (500 Error)] ──x (Exits)
```

### Architecture After
```
Donate with Ethereum (Flow 1)
  [ETH Input] ──> [MetaMask Button] ──> Check Duplicates (Idempotency) ──> Record (amount, currency='ETH') ──> Anchor

Donate with Razorpay (Flow 2)
  [INR Input] ──> [Razorpay Button] ──> Create Order ──> Complete Payment ──> Verify Signature ──> Check Duplicates (Idempotency) ──> Record (amount, currency='INR') ──> Anchor
```

---

## 5. Remaining TODOs
*   Configure production environment variables on Render and Netlify hosting services.
