# CampusChain: Complete API Routing and Execution Flows

This reference guide contains the full API index and sequential execution flowcharts (top-to-bottom call stacks) for every API route in the **CampusChain** system.

---

## 🌐 API Index

| Endpoint | Method | Authentication Required | Active Router File | Description / Response Summary |
|---|---|---|---|---|
| `/signup` | `POST` | No | [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js) | Creates user record + donor/ngo details. Returns success. |
| `/login` | `POST` | No | [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js) | Validates credentials and returns JWT session token. |
| `/api/fundraiser/create` | `POST` | Yes (`ngo` role) | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Creates a new campaign record. Returns `fundraiserId`. |
| `/api/fundraisers` | `GET` | No | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Returns array of all active and closed campaigns. |
| `/api/fundraiser/:id` | `GET` | No | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Returns details for a single campaign. |
| `/api/raised/:id` | `GET` | No | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Returns aggregated total raised in campaign. |
| `/api/my-fundraisers` | `GET` | Yes (`ngo` role) | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Returns campaigns created by the active NGO. |
| `/api/fundraiser/:id/status` | `PUT` | Yes (`ngo` role) | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Updates status of NGO's campaign ('active'/'closed'). |
| `/api/fundraiser/:id/description` | `PUT` | Yes (`ngo` role) | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js) | Updates description of NGO's campaign. |
| `/api/donate` | `POST` | Yes (`donor` role) | [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js) | Records ETH donation and logs cryptographic proof. |
| `/api/my-donations` | `GET` | Yes (`donor` role) | [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js) | Returns donations logged by the active donor. |
| `/api/fundraiser/:id/donations` | `GET` | Yes | [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js) | Returns donations logged for a specific campaign. |
| `/api/razorpay/create-order` | `POST` | Yes (`donor` role) | [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js) | Generates Razorpay transaction order. |
| `/api/razorpay/verify` | `POST` | Yes (`donor` role) | [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js) | Verifies Razorpay checkout signatures. |
| `/api/donation/:donationId/verify` | `GET` | Yes (`donor` role) | [donationVerification.routes.js](file:///d:/CampusChain/backend/routes/donationVerification.routes.js) | Audits local donation records against proof registry. |
| `/api/comment` | `POST` | Yes | [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js) | Appends user comment message to a campaign. |
| `/api/comments/:id` | `GET` | No | [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js) | Returns comments logged for a specific campaign. |
| `/api/comments/:commentId` | `DELETE` | Yes | [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js) | Deletes comment (restricted to campaign creator). |
| `/api/profile` | `GET` | Yes | [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js) | Returns profile details based on user role. |
| `/api/profile/update` | `PUT` | Yes | [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js) | Updates user profile and role details. |

---

## 1. User Signup Flow — `POST /signup`

```
+--------------------------------------------------------+
| 1. User submits signup details                         |
|    frontend: Signup Form -> signup.html                |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Router forwards to signup controller handler        |
|    backend/routes/auth.routes.js -> router.post()      |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Password hashed using bcrypt                        |
|    backend/controllers/auth.controller.js -> signup()  |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. User profile written to database                    |
|    backend/controllers/auth.controller.js -> SQL Query |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. NGO or Donor details populated                      |
|    backend/controllers/auth.controller.js -> SQL Query |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 6. Returns success response mapping details            |
|    res.json({ message: "Signup successful" })          |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Protected by `wrapAsync` wrapper for error catch-all routing.
* **Failures:** If an email is registered twice, database returns duplicate error `ER_DUP_ENTRY`, returning status `400` with `"Email already exists"`. Missing parameters return status `400` with `"Missing required fields"`.

---

## 2. User Login Flow — `POST /login`

```
+--------------------------------------------------------+
| 1. User submits login credentials                      |
|    frontend/login.js -> loginUser()                    |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Routing mapped to login handler                     |
|    backend/routes/auth.routes.js -> router.post()      |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. User row fetched by email lookup                    |
|    backend/controllers/auth.controller.js -> SQL Query |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Assert passwords match using bcrypt.compare()       |
|    backend/controllers/auth.controller.js -> login()   |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Sign new JWT token session with user properties     |
|    backend/controllers/auth.controller.js -> jwt.sign()|
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 6. Write token variables to localStorage and redirect  |
|    frontend/login.js -> redirect dashboard             |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Direct unauthenticated routing wrapped in `wrapAsync`.
* **Failures:** Missing fields trigger status `400` (`"Missing email or password"`). Unregistered emails return `400` (`"User not found"`). Password mismatch returns status `400` (`"Incorrect password"`).

---

## 3. Create Fundraiser Flow — `POST /api/fundraiser/create`

```
+--------------------------------------------------------+
| 1. NGO submits details from Creation Dashboard         |
|    frontend/create-fundraiser.js -> submitForm()       |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Auth verifies token and confirms NGO role           |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Route parameters validated in controller            |
|    backend/controllers/fundraiser.controller.js        |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Create fundraiser row in database                   |
|    backend/controllers/fundraiser.controller.js        |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Return success and auto-increment identifier ID     |
|    res.json({ message: "Fundraiser created" })         |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Enforced by `verifyToken` and `requireRole("ngo")`.
* **Failures:** Invalid JWT triggers status `401` (`"Invalid or expired token"`). Mismatched role returns status `403` (`"Forbidden"`). Missing core attributes returns `400` (`"Missing fundraiser data"`).

---

## 4. Get Fundraiser(s) Flow — `GET /api/fundraisers`

```
+--------------------------------------------------------+
| 1. Client requests campaign feed array                 |
|    frontend/fundraiser.js -> loadFundraisers()         |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Route maps directly to fetch controller             |
|    backend/routes/fundraiser.routes.js                 |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. DB queries rows with currency conversion aggregates  |
|    backend/controllers/fundraiser.controller.js        |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Output dataset mapping models to client structure   |
|    res.json(rows)                                      |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Public route (no authentication).
* **Failures:** Database connection issues trigger standard global handler response mapping status `500` (`"Database error fetching fundraisers"`).

---

## 5. Close Fundraiser Flow — `PUT /api/fundraiser/:id/status`

```
+--------------------------------------------------------+
| 1. NGO toggles status button to inactive               |
|    frontend/ngo-dashboard.js -> closeFundraiser()      |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Middleware validates session token and role checks  |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Update status in database                           |
|    backend/controllers/fundraiser.controller.js        |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Returns confirmation response                       |
|    res.json({ success: true })                         |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Protected by `verifyToken` and `requireRole("ngo")`.
* **Failures:** Attempting to update a campaign created by another NGO returns status `403` (`"Forbidden: You do not own this fundraiser or it does not exist"`).

---

## 6. Donate via MetaMask Flow — `POST /api/donate`

```
+--------------------------------------------------------+
| 1. Donor starts donation and triggers wallet window    |
|    frontend/fundraiser-detail.js -> donateEth()        |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Calls smart contract donate() and waits for mined   |
|    contract.methods.donate(id).send()                  |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Verify user JWT token and donor role                |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Save details to database                            |
|    backend/services/donation.service.js                |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Create cryptographic proof hash                     |
|    backend/services/blockchain.service.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 6. Anchor proof on proof registry contract             |
|    backend/services/blockchain.service.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 7. Update database record with anchor transaction hash |
|    backend/controllers/donation.controller.js          |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Protected by `verifyToken` and `requireRole("donor")`.
* **Failures:** Submitting a duplicate MetaMask transaction hash triggers status `409` (`"This transaction hash has already been recorded."`). Invalid JWT tokens yield status `401`.

---

## 7. Razorpay Order Flow — `POST /api/razorpay/create-order`

```
+--------------------------------------------------------+
| 1. User inputs amount and requests Razorpay order      |
|    frontend/fundraiser-detail.js -> donateRazorpay()   |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Verify user JWT token and donor role                |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Instantiates Razorpay client with API keys          |
|    backend/controllers/payment.controller.js           |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Calls Razorpay API node dependency                  |
|    razorpay.orders.create({ amount: paiseAmount })     |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Return order details (order_id) to client           |
|    res.status(201).json({ order_id, key_id })          |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Protected by `verifyToken` and `requireRole("donor")`.
* **Failures:** Invalid body parameters trigger status `400` (`"Invalid amount"`). If credentials are misconfigured, returns status `500` (`"Razorpay is not configured."`).

---

## 8. Razorpay Verify Flow — `POST /api/razorpay/verify`

```
+--------------------------------------------------------+
| 1. Iframe returns details; calls verify endpoint       |
|    frontend/fundraiser-detail.js -> fetch()            |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Verify token and roles                              |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Compute local HMAC-SHA256 signature to verify match |
|    backend/controllers/payment.controller.js           |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Confirm transaction is not duplicate                |
|    backend/controllers/payment.controller.js           |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Save payment details and trigger on-chain anchoring |
|    donation.service.js & blockchain.service.js         |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Protected by `verifyToken` and `requireRole("donor")`.
* **Failures:** Invalid signature returns status `401` (`"Invalid Razorpay signature."`). Duplicate payment ID returns status `409` (`"This payment has already been recorded."`).

---

## 9. Get My Donations Flow — `GET /api/my-donations`

```
+--------------------------------------------------------+
| 1. Donor loads contribution profile history            |
|    frontend/donor-dashboard.js -> loadDonations()      |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Verify user JWT token and donor role                |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Database query fetching donations by donor wallet    |
|    backend/controllers/donation.controller.js          |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Returns JSON data list                              |
|    res.json(rows)                                      |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Enforced by `verifyToken` and `requireRole("donor")`.
* **Failures:** Missing token headers return status `401`. Database connection errors return status `500` (`"Database error fetching donations"`).

---

## 10. Get Campaign Donations Flow — `GET /api/fundraiser/:id/donations`

```
+--------------------------------------------------------+
| 1. Client loads donation history for campaign card     |
|    frontend/fundraiser-detail.js -> loadDonations()    |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Verify session JWT token                            |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Query donations table using campaign ID             |
|    backend/controllers/donation.controller.js          |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Return array details                                |
|    res.json(rows)                                      |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Guarded by `verifyToken` only (accessible to both donors and NGOs).
* **Failures:** Sending a non-numeric or invalid parameter returns status `400` (`"Invalid fundraiser ID"`).

---

## 11. Donation Proof Verification Flow — `GET /api/donation/:donationId/verify`

```
+--------------------------------------------------------+
| 1. Donor clicks audit validation link                  |
|    frontend/donor-dashboard.js -> verifyDonation()     |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Verify token and donor role                         |
|    backend/middlewares/auth.middleware.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Database fetch of target transaction details        |
|    backend/controllers/donationVerification.controller.js|
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Re-generate expected Keccak256 hash                 |
|    backend/services/blockchain.service.js              |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Execute view query against DonationProofRegistry    |
|    contract.verifyDonation(donationHash)               |
+--------------------------------------------------------+
```

### Key Points
* **Middleware:** Guarded by `verifyToken` and `requireRole("donor")`.
* **Failures:** Querying a donation ID that does not exist or belongs to another donor returns status `404` (`"Donation not found"`).

---

## 12. Create/Read/Delete Comments Flows

### A. Add Comment — `POST /api/comment`
```
[Client submits text] -> [verifyToken] -> [Insert database record] -> [Return success JSON]
```
* **Middleware:** Guarded by `verifyToken`.
* **Failures:** Empty comment body text or missing IDs return status `400` (`"Missing comment data"`).

### B. Fetch Comments — `GET /api/comments/:id`
```
[Client requests comments] -> [Execute database JOIN query] -> [Return comment records]
```
* **Middleware:** Public route (no authentication).
* **Failures:** Database issues yield status `500`.

### C. Delete Comment — `DELETE /api/comments/:commentId`
```
[Request delete] -> [verifyToken] -> [Assert user wallet matches owner_wallet] -> [Delete comment row]
```
* **Middleware:** Guarded by `verifyToken`.
* **Failures:** Non-existent comments return status `404`. Attempting to delete comments on fundraisers owned by other NGOs returns status `403` (`"Forbidden"`).

---

## 13. Profile Routes Flows

### A. Fetch Profile — `GET /api/profile`
```
[Request Profile Details] -> [verifyToken] -> [Query users table + details join] -> [Return details JSON]
```
* **Middleware:** Guarded by `verifyToken`.
* **Failures:** If no profile record matches the JWT ID, returns status `404` (`"User profile not found"`).

### B. Update Profile — `PUT /api/profile/update`
```
[Submit Profile Changes] -> [verifyToken] -> [Update users profile details] -> [Return confirmation JSON]
```
* **Middleware:** Guarded by `verifyToken`.
* **Failures:** DB write error issues return status `500` (`"Database error updating profile"`).

---
