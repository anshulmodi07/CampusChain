# CampusChain Production API Architecture & Engineering Manual
*Compiled by Senior Backend Architect*

---

## 📂 System Bootstrap & Routing Architecture

### 1. Backend Entry Point & Lifecycle
The backend server initializes via [server.js](file:///d:/CampusChain/backend/server.js).
1.  **Environment Setup**: Loads configuration variables from `.env` via `dotenv.config()`.
2.  **Express Import**: Pulls the pre-configured app instance from [app.js](file:///d:/CampusChain/backend/app.js).
3.  **Port Allocation**: Reads `process.env.PORT` (falling back to `5000`).
4.  **Network Socket Allocation**: Runs `app.listen(PORT)`, opening a TCP listener socket on the host network interface. Node holds the Event Loop active as long as the socket remains open.

### 2. Route Registration & Middleware Pipelines
Express modularizes routing using `express.Router()` instances. Route registration is initialized in [app.js](file:///d:/CampusChain/backend/app.js) in the following order:
```javascript
app.use(cors());                      // 1. Cross-Origin Header Injector
app.use(express.json());              // 2. Incoming JSON Parser
app.use(express.static(...));         // 3. Static Asset Router (redundant in production)

// Registered API Router Modules
app.use(profileRoutes);               // 4. Profile API Routes
app.use(authRoutes);                  // 5. Authentication API Routes
app.use(fundraiserRoutes);            // 6. Fundraiser API Routes
app.use(donationRoutes);              // 7. Donation Tracker Routes
app.use(paymentRoutes);               // 8. Razorpay Gateway Routes
app.use(donationVerificationRoutes);  // 9. On-Chain Verification Routes
app.use(commentRoutes);               // 10. Comment Section Routes

app.use(errorMiddleware);             // 11. Centralized Error Handler (Must be LAST)
```

### 3. Folder Layout

```text
CampusChain/backend/
├── server.js                 # Network Entry Point (allocates TCP socket)
├── app.js                    # Express Application Bootstrap & Global Middleware
├── package.json              # Module manifest specifying "type": "module"
├── certs/
│   └── tidb-ca.pem           # TLS CA certificate for distributed TiDB Cloud
├── db/
│   └── index.js              # TiDB connection pool initialization
├── middlewares/
│   ├── auth.middleware.js    # JWT authorization and verifyToken/requireRole gates
│   └── error.middleware.js   # Centralized error mapping and formatting middleware
├── routes/                   # Router definitions declaring URLs and pipeline middleware
│   ├── auth.routes.js
│   ├── comment.routes.js
│   ├── donation.routes.js
│   ├── donationVerification.routes.js
│   ├── fundraiser.routes.js
│   ├── payment.routes.js
│   └── profile.routes.js
├── controllers/              # HTTP request parsing, input validation, & API response logic
│   ├── auth.controller.js
│   ├── comment.controller.js
│   ├── donation.controller.js
│   ├── donationVerification.controller.js
│   ├── fundraiser.controller.js
│   ├── payment.controller.js
│   └── profile.controller.js
├── services/                 # core business operations and external integrations
│   ├── blockchain.service.js # Ethereum Sepolia RPC calls via Ethers.js
│   ├── donation.service.js   # Database-level donation insertion
│   └── donationVerification.service.js # Unused stub code
└── utils/
    ├── ExpressError.js       # Custom operational error extending native Error class
    └── wrapAsync.js          # Async wrapper to forward rejected promise errors
```

---

## 🗄️ Master API Inventory

| Method | Endpoint | Route File | Controller Function | Middlewares | Database Tables | External Services |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | [app.js](file:///d:/CampusChain/backend/app.js#L76) | Inline Anonymous | None | None | None |
| **GET** | `/test-db` | [app.js](file:///d:/CampusChain/backend/app.js#L64) | Inline Anonymous | None | None | None |
| **GET** | `/health` | [app.js](file:///d:/CampusChain/backend/app.js#L82) | Inline Anonymous | None | None | None |
| **POST** | `/signup` | [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js#L16) | `signup` | `wrapAsync` | `users`, `donor_details`, `ngo_details` | None |
| **POST** | `/login` | [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js#L17) | `login` | `wrapAsync` | `users` | None |
| **GET** | `/api/profile` | [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js#L14) | `getProfile` | `verifyToken` | `users`, `donor_details`, `ngo_details` | None |
| **PUT** | `/api/profile/update` | [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js#L15) | `updateProfile` | `verifyToken` | `users`, `donor_details`, `ngo_details` | None |
| **GET** | `/api/fundraisers` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L22) | `getAllFundraisers` | None | `fundraisers`, `donations` | None |
| **GET** | `/api/fundraiser/:id` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L23) | `getFundraiserById` | None | `fundraisers`, `donations` | None |
| **POST**| `/api/fundraiser/create`| [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L26) | `createFundraiser` | `verifyToken`, `requireRole('ngo')` | `fundraisers` | None |
| **GET** | `/api/my-fundraisers` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L25) | `getMyFundraisers` | `verifyToken`, `requireRole('ngo')` | `fundraisers`, `donations` | None |
| **GET** | `/api/raised/:id` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L24) | `getTotalRaised` | None | `donations` | None |
| **PUT** | `/api/fundraiser/:id/status`| [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L27) | `updateFundraiserStatus` | `verifyToken`, `requireRole('ngo')` | `fundraisers` | None |
| **PUT** | `/api/fundraiser/:id/description`| [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L28) | `updateFundraiserDescription` | `verifyToken`, `requireRole('ngo')` | `fundraisers` | None |
| **POST**| `/api/donate` | [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L13) | `donate` | `verifyToken`, `requireRole('donor')` | `donations` | Sepolia: `DonationProofRegistry` |
| **GET** | `/api/my-donations` | [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L14) | `myDonations` | `verifyToken`, `requireRole('donor')` | `donations`, `fundraisers` | None |
| **GET** | `/api/fundraiser/:id/donations`| [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L15) | `getFundraiserDonations` | `verifyToken` | `donations`, `users` | None |
| **POST**| `/api/comment` | [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js#L22) | `addComment` | `verifyToken` | `comments` | None |
| **GET** | `/api/comments/:id` | [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js#L23) | `getComments` | None | `comments`, `users` | None |
| **DELETE**| `/api/comments/:commentId`| [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js#L24) | `deleteComment` | `verifyToken` | `comments`, `fundraisers` | None |
| **POST**| `/api/razorpay/create-order`| [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js#L12) | `createOrder` | `verifyToken`, `requireRole('donor')` | None | Razorpay API |
| **POST**| `/api/razorpay/verify` | [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js#L19) | `verifyPayment` | `verifyToken`, `requireRole('donor')` | `donations` | Razorpay API, Sepolia Contract |
| **GET** | `/api/donation/:donationId/verify`| [donationVerification.routes.js](file:///d:/CampusChain/backend/routes/donationVerification.routes.js#L11)| `verifyDonationProof` | `verifyToken`, `requireRole('donor')` | `donations` | Sepolia: `DonationProofRegistry` |

---

## 🛠️ Global Middlewares Enforcers

### 1. `verifyToken`
*   **Why it exists**: Authenticates the client by verifying the signature of their JWT, protecting routes from anonymous access.
*   **Checks**: Reads the `Authorization` header, extracts the `Bearer ` token, and verifies it against `process.env.JWT_SECRET`.
*   **Appends to `req`**: Creates a `req.user` payload object containing `{ id, role, wallet }`.
*   **Termination**: Terminated if the header is missing (`401 No token provided`) or the signature is invalid/expired (`401 Invalid or expired token`).

### 2. `requireRole(role)`
*   **Why it exists**: Gathers route authorization logic under a role-based gateway.
*   **Checks**: Asserts that `req.user.role` matches the expected string role parameter (e.g. `'ngo'`, `'donor'`).
*   **Appends to `req`**: None.
*   **Termination**: Terminated if `req.user` is undefined (`401 User not authenticated`) or if the user's role does not match (`403 Forbidden`).

---

## ⚡ API Specification: Detailed Endpoints

---

### Route Group A: Core Infrastructure & Public Status

#### 1. Server Root Connection Check (`GET /`)
*   **Routing**: Defined inside [app.js](file:///d:/CampusChain/backend/app.js#L76).
*   **Pipeline**: Client → Route Listener → Inline Callback → HTTP Response.
*   **Middleware**: None.
*   **Controller**: Express inline handler sending a plain string confirming service availability.
*   **Database**: None.
*   **External Services**: None.
*   **Security & Authorization**: Unprotected public endpoint.
*   **Input & Output**:
    *   *Path Params*: None.
    *   *Request Body*: Empty.
    *   *Response Content*: `200 OK` plain text: `"CampusChain Backend is running"`
*   **Interview Focus**:
    *   *30-Second Pitch*: A basic endpoint used to verify that the Express app is running and responsive.
    *   *Why this design*: Provides a quick diagnostic checkpoint for DNS routing and load balancers.
*   **Sequence Diagram**:
```text
Client Browser            Nginx Gateway             Express Engine
      |                         |                         |
      |---- GET / ------------->|                         |
      |                         |---- proxy_pass -------> |
      |                         |                         |-- Process routing --+
      |                         |                         |                     |
      |                         |<--- Return Plain Text --+                     |
      |<--- 200 Plain Text -----|                                               |
```

#### 2. Database Connectivity Test (`GET /test-db`)
*   **Routing**: Defined in [app.js](file:///d:/CampusChain/backend/app.js#L64).
*   **Pipeline**: Client → Route → Anonymous Handler → [db/index.js](file:///d:/CampusChain/backend/db/index.js) connection pool query → Client.
*   **Middleware**: None.
*   **Controller**: Query callback that runs a test database read (`SELECT 1`).
*   **Database**:
    *   *Tables*: None.
    *   *Query*: `SELECT 1`
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint.
*   **Input & Output**:
    *   *Request*: Empty.
    *   *Success Response*: `200 OK` plain text: `"DB OK"`
    *   *Failure Response*: `500 Internal Server Error` plain text: `"DB ERROR"`
*   **Interview Focus**:
    *   *30-Second Pitch*: Checks that the connection pool to TiDB Cloud is active and responding.
    *   *Why this design*: Separate check from `/health` to isolate database failures from general application errors.
*   **Sequence Diagram**:
```text
Client Browser            Express Engine               TiDB Pool
      |                         |                          |
      |---- GET /test-db ------>|                          |
      |                         |---- SELECT 1 ----------->|
      |                         |<--- 1 (Result Row) ------|
      |<--- 200 Plain "DB OK"---|                          |
```

#### 3. Service Liveness Health Check (`GET /health`)
*   **Routing**: Defined inside [app.js](file:///d:/CampusChain/backend/app.js#L82).
*   **Pipeline**: Client → Route → Inline Handler → JSON Response.
*   **Middleware**: None.
*   **Controller**: Returns structured JSON status check.
*   **Database**: None.
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint.
*   **Input & Output**:
    *   *Request*: Empty.
    *   *Response JSON*:
      ```json
      { "status": "ok", "service": "CampusChain Backend" }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: A light, dependency-free JSON endpoint for monitoring services (e.g. AWS Route 53, Kubernetes liveness probes).
    *   *Why this design*: Avoids querying the database to keep the check lightweight and fast, preventing connection pool exhaustion from monitoring scripts.
*   **Sequence Diagram**:
```text
Client Browser            Nginx Gateway             Express Engine
      |                         |                         |
      |---- GET /health ------->|                         |
      |                         |---- proxy_pass -------> |
      |                         |<--- 200 JSON Response---|
      |<--- 200 JSON -----------|
```

---

### Route Group B: User Access & Profile Management

#### 4. Register New User Account (`POST /signup`)
*   **Routing**: Defined inside [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js#L16). Registered as `router.post("/signup", wrapAsync(signup))`.
*   **Pipeline**: Client → Route → `wrapAsync` wrapper → `signup` controller function → TiDB Cloud Insert → Client response.
*   **Middleware**: None.
*   **Controller**: `signup` in [auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js#L12):
    *   Validates that `name`, `email`, `password`, and `role` are present in the request body.
    *   Generates a one-way hash of the password using `bcrypt.hash` with 10 salt rounds.
    *   Inserts the record into the `users` table.
    *   Depending on the `role` parameter, it inserts a corresponding detail row into either `donor_details` or `ngo_details`.
*   **Database**:
    *   *Tables*: `users`, `donor_details`, `ngo_details`.
    *   *Queries*:
      ```sql
      INSERT INTO users (name, email, password_hash, role, wallet_address) VALUES (?, ?, ?, ?, ?);
      INSERT INTO donor_details (donor_id) VALUES (?);
      INSERT INTO ngo_details (ngo_id) VALUES (?);
      ```
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint. Standard database error codes (`ER_DUP_ENTRY`) are intercepted to return a user-friendly `400 Email already exists` message instead of database leaks.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      {
        "name": "Alex Smith",
        "email": "alex@university.edu",
        "password": "Password123",
        "role": "donor",
        "wallet_address": "0x9E758a0a9A..."
      }
      ```
    *   *Response JSON*:
      ```json
      { "message": "Signup successful", "id": 42 }
      ```
    *   *Error Responses*:
        *   `400 Missing required fields` (Validation failure)
        *   `400 Email already exists` (Duplicate constraint violation)
*   **Interview Focus**:
    *   *30-Second Pitch*: Creates a user record, hashes the password, and initializes role-specific tables (`donor_details` or `ngo_details`) in a single workflow.
    *   *Possible improvements*: Implement database transactions (`START TRANSACTION` / `COMMIT`) around the `users` and details insertions to avoid orphan user accounts if the second insert fails.
*   **Sequence Diagram**:
```text
Client Browser            Express Controller               Bcrypt Engine               TiDB Engine
      |                           |                              |                          |
      |-- POST /signup ---------->|                              |                          |
      |                           |-- hash(password, 10) ------->|                          |
      |                           |<-- return password_hash -----|                          |
      |                           |                                                         |
      |                           |-- INSERT INTO users ----------------------------------->|
      |                           |<-- Return insertId (42) --------------------------------|
      |                           |                                                         |
      |                           |-- INSERT INTO donor_details (42) ---------------------->|
      |                           |<-- Return Success --------------------------------------|
      |<-- 200 Success JSON ------|                                                         |
```

#### 5. Authenticate Session (`POST /login`)
*   **Routing**: Defined inside [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js#L17). Registered as `router.post("/login", wrapAsync(login))`.
*   **Pipeline**: Client → Route → `wrapAsync` → `login` controller function → TiDB query → `bcrypt.compare` verification → Client response.
*   **Middleware**: None.
*   **Controller**: `login` in [auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js#L58):
    *   Validates that `email` and `password` are present in the request body.
    *   Queries `users` to fetch the record matching the email.
    *   Compares the provided password with the stored hash using `bcrypt.compare`.
    *   Generates a signed JWT containing the payload `{ id, role, wallet }` with a 24-hour expiration.
*   **Database**:
    *   *Tables*: `users`
    *   *Query*:
      ```sql
      SELECT * FROM users WHERE email = ? LIMIT 1;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Checks password hashes against plain text inputs using a time-tested hashing comparison, preventing timing-leak optimizations.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      { "email": "alex@university.edu", "password": "Password123" }
      ```
    *   *Response JSON*:
      ```json
      {
        "message": "Login successful",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "role": "donor",
        "wallet": "0x9E758a0a9A..."
      }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Authenticates user credentials against the database and returns a signed, stateless JWT token for subsequent requests.
    *   *Why this design*: Stateless JWTs allow the backend to scale horizontally without maintaining session stores or querying a database for every authorized request.
*   **Sequence Diagram**:
```text
Client Browser            Express Controller               Bcrypt Engine               TiDB Engine
      |                           |                              |                          |
      |-- POST /login ----------->|                              |                          |
      |                           |-- SELECT WHERE email = ? ------------------------------>|
      |                           |<-- Return user row (with hash) -------------------------|
      |                           |                                                         |
      |                           |-- compare(password, hash) -->|                          |
      |                           |<-- Return true/false --------|                          |
      |                           |                                                         |
      |                           |-- Generate JWT Payload ------+                          |
      |                           |   (Sign with secret)         |                          |
      |<-- 200 Token JSON --------+<-----------------------------+                          |
```

#### 6. Retrieve Authenticated Profile (`GET /api/profile`)
*   **Routing**: Defined inside [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js#L14). Registered as `router.get("/api/profile", verifyToken, getProfile)`.
*   **Pipeline**: Client → Route → `verifyToken` middleware → `getProfile` controller function → Join DB query → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
*   **Controller**: `getProfile` in [profile.controller.js](file:///d:/CampusChain/backend/controllers/profile.controller.js#L4):
    *   Reads `req.user.id` and `req.user.role`.
    *   If the role is `'donor'`, it queries the `users` table joined with `donor_details`.
    *   If the role is `'ngo'`, it queries the `users` table joined with `ngo_details`.
*   **Database**:
    *   *Tables*: `users`, `donor_details`, `ngo_details`.
    *   *Queries*:
      ```sql
      -- Donor profile query
      SELECT u.id, u.name, u.email, u.role, u.wallet_address, d.phone, d.city, d.state, d.country, d.donation_preference
      FROM users u LEFT JOIN donor_details d ON u.id = d.donor_id WHERE u.id = ?;

      -- NGO profile query
      SELECT u.id, u.name, u.email, u.role, u.wallet_address, n.organization_name, n.registration_number, n.contact_person, n.contact_phone, n.address
      FROM users u LEFT JOIN ngo_details n ON u.id = n.ngo_id WHERE u.id = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Access is gated using the `verifyToken` middleware. Profiles are queried using the authenticated `id` from the JWT payload, preventing unauthorized users from accessing or modifying other profiles.
*   **Input & Output**:
    *   *Path Params*: None.
    *   *Response JSON (Donor)*:
      ```json
      {
        "id": 42,
        "name": "Alex Smith",
        "email": "alex@university.edu",
        "role": "donor",
        "wallet_address": "0x9E758a0a9A...",
        "phone": "555-0199",
        "city": "Boston",
        "state": "MA",
        "country": "US",
        "donation_preference": "Education"
      }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves profile information by performing a role-based join on the database using the user's authenticated ID.
    *   *Why this design*: Splitting role-based details into separate tables (`donor_details` and `ngo_details`) prevents sparse columns in the primary `users` table.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Middleware            Profile Controller             TiDB Engine
      |                             |                               |                           |
      |-- GET /api/profile -------->|                               |                           |
      |                             |-- Decode & Validate JWT ------+                           |
      |                             |   (Attaches req.user)         |                           |
      |                             |                               |                           |
      |                             +------------------------------>|                           |
      |                                                             |-- SELECT JOIN query ----->|
      |                                                             |<-- Return Profile Row ----|
      |<-- 200 Profile JSON ----------------------------------------+                           |
```

#### 7. Update User Profile (`PUT /api/profile/update`)
*   **Routing**: Defined inside [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js#L15). Registered as `router.put("/api/profile/update", verifyToken, updateProfile)`.
*   **Pipeline**: Client → Route → `verifyToken` middleware → `updateProfile` controller function → Write updates to DB → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
*   **Controller**: `updateProfile` in [profile.controller.js](file:///d:/CampusChain/backend/controllers/profile.controller.js#L40):
    *   Extracts update parameters from `req.body`.
    *   Updates the core fields (`name`, `wallet_address`) in the `users` table.
    *   Updates role-specific parameters in `donor_details` or `ngo_details` using `req.user.role` as the guide.
*   **Database**:
    *   *Tables*: `users`, `donor_details`, `ngo_details`.
    *   *Queries*:
      ```sql
      UPDATE users SET name = ?, wallet_address = ? WHERE id = ?;
      
      -- If role is 'donor'
      UPDATE donor_details SET phone = ?, city = ?, state = ?, country = ?, donation_preference = ? WHERE donor_id = ?;

      -- If role is 'ngo'
      UPDATE ngo_details SET organization_name = ?, registration_number = ?, contact_person = ?, contact_phone = ?, address = ? WHERE ngo_id = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Access is gated using the `verifyToken` middleware. Target rows are identified using the authenticated user ID from the JWT (`req.user.id`), preventing unauthorized profile changes.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      {
        "name": "Alex J. Smith",
        "wallet_address": "0x9E758a0a9A...",
        "phone": "555-0199",
        "city": "Boston",
        "state": "MA",
        "country": "US",
        "donation_preference": "Medical Research"
      }
      ```
    *   *Response JSON*:
      ```json
      { "message": "Profile updated successfully" }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Updates profile information by writing to the core `users` table and the role-specific details table using the user's authenticated ID.
    *   *Possible improvements*: Wrap the database operations in a transaction block to ensure that either both updates succeed or neither does.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Middleware            Profile Controller             TiDB Engine
      |                             |                               |                           |
      |-- PUT /api/profile/update ->|                               |                           |
      |                             |-- Validate JWT and token -----+                           |
      |                             |                               |                           |
      |                             +------------------------------>|                           |
      |                                                             |-- UPDATE users ---------->|
      |                                                             |<-- Confirm Update --------|
      |                                                             |                           |
      |                                                             |-- UPDATE donor_details -->|
      |                                                             |<-- Confirm Update --------|
      |<-- 200 Confirmation JSON -----------------------------------+                           |
```

---

### Route Group C: Fundraiser Management

#### 8. Retrieve All Fundraisers (`GET /api/fundraisers`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L22). Registered as `router.get("/api/fundraisers", getAllFundraisers)`.
*   **Pipeline**: Client → Route → `getAllFundraisers` controller function → Database query with aggregation → Client response.
*   **Middleware**: None.
*   **Controller**: `getAllFundraisers` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L5):
    *   Queries the `fundraisers` table joined with `donations` to aggregate total funds raised.
    *   Applies a static exchange rate conversion (`amount / 300000.0`) if the donation currency is `'INR'`.
*   **Database**:
    *   *Tables*: `fundraisers`, `donations`.
    *   *Query*:
      ```sql
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal, f.owner_wallet AS ownerWallet,
             f.fundraiser_type AS fundraiserType, f.category, f.people_affected AS peopleAffected, f.status,
             IFNULL(SUM(CASE WHEN d.currency = 'INR' THEN d.amount / 300000.0 ELSE d.amount END), 0) AS raised
      FROM fundraisers f LEFT JOIN donations d ON f.fundraiser_id = d.fundraiser_id
      GROUP BY f.fundraiser_id;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint.
*   **Input & Output**:
    *   *Request*: Empty.
    *   *Response JSON*:
      ```json
      [
        {
          "fundraiserId": 1,
          "title": "Medical Supplies drive",
          "description": "Providing basic medical kits...",
          "goal": 15.5,
          "ownerWallet": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "fundraiserType": "public",
          "category": "Medical",
          "peopleAffected": 500,
          "status": "active",
          "raised": 2.45
        }
      ]
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves all fundraisers along with their aggregated donation totals, converting INR to ETH at a static rate.
    *   *Possible improvements*: Cache these results in Redis with a short TTL (e.g., 60 seconds) to reduce load on the primary database, and query an external API for real-time exchange rates instead of hardcoding them.
*   **Sequence Diagram**:
```text
Client Browser            Fundraiser Controller            TiDB Database Engine
      |                             |                               |
      |-- GET /api/fundraisers ---->|                               |
      |                             |-- Run Aggregate Join Query -->|
      |                             |<-- Return List of Rows -------|
      |<-- 200 List JSON -----------+                               |
```

#### 9. Retrieve Fundraiser by ID (`GET /api/fundraiser/:id`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L23). Registered as `router.get("/api/fundraiser/:id", getFundraiserById)`.
*   **Pipeline**: Client → Route → `getFundraiserById` controller function → Database query with single row aggregation → Client response.
*   **Middleware**: None.
*   **Controller**: `getFundraiserById` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L26):
    *   Extracts the fundraiser ID from the path parameters.
    *   Queries the `fundraisers` table joined with `donations` to aggregate total funds raised for the fundraiser.
    *   Applies a static exchange rate conversion (`amount / 300000.0`) if the donation currency is `'INR'`.
*   **Database**:
    *   *Tables*: `fundraisers`, `donations`.
    *   *Query*:
      ```sql
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal, f.owner_wallet AS ownerWallet,
             f.fundraiser_type AS fundraiserType, f.category, f.people_affected AS peopleAffected, f.created_at AS createdAt, f.status,
             IFNULL(SUM(CASE WHEN d.currency = 'INR' THEN d.amount / 300000.0 ELSE d.amount END), 0) AS raised
      FROM fundraisers f LEFT JOIN donations d ON f.fundraiser_id = d.fundraiser_id
      WHERE f.fundraiser_id = ? GROUP BY f.fundraiser_id;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint.
*   **Input & Output**:
    *   *Path Params*: `id` (integer)
    *   *Response JSON*:
      ```json
      {
        "fundraiserId": 1,
        "title": "Medical Supplies drive",
        "description": "Providing basic medical kits...",
        "goal": 15.5,
        "ownerWallet": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "fundraiserType": "public",
        "category": "Medical",
        "peopleAffected": 500,
        "createdAt": "2026-07-21T00:00:00Z",
        "status": "active",
        "raised": 2.45
      }
      ```
    *   *Error Response*:
        *   `404 Fundraiser not found`
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves details for a specific fundraiser, returning aggregated donation totals.
    *   *Why this design*: Aggregating donation totals on demand ensures real-time accuracy, though it is more resource-intensive than caching totals in a database column.
*   **Sequence Diagram**:
```text
Client Browser            Fundraiser Controller            TiDB Database Engine
      |                             |                               |
      |-- GET /api/fundraiser/1 --->|                               |
      |                             |-- SELECT WHERE ID = 1 ------->|
      |                             |<-- Return Single Row ---------|
      |<-- 200 Details JSON --------+                               |
```

#### 10. Create Fundraiser Campaign (`POST /api/fundraiser/create`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L26). Registered as `router.post("/api/fundraiser/create", verifyToken, requireRole("ngo"), createFundraiser)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('ngo')` → `createFundraiser` controller function → TiDB Cloud Insert → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("ngo")`: Restricts access to users with the `'ngo'` role.
*   **Controller**: `createFundraiser` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L53):
    *   Validates that `title` and `goal` are present in the request body.
    *   Extracts the owner's wallet address from `req.user.wallet`.
    *   Inserts the new fundraiser record into the `fundraisers` table.
*   **Database**:
    *   *Tables*: `fundraisers`
    *   *Query*:
      ```sql
      INSERT INTO fundraisers (title, description, goal, owner_wallet, fundraiser_type, category, people_affected)
      VALUES (?, ?, ?, ?, ?, ?, ?);
      ```
*   **External Services**: None (The database serves as the registry cache. In the actual deployment flow, the campaign must also be deployed to the Ethereum blockchain by the frontend using `CampusChainCrowdfunding`).
*   **Security & Authorization**: Protected by `verifyToken` and restricted to the `'ngo'` role using `requireRole("ngo")` to prevent unauthorized campaign creation.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      {
        "title": "Clean Water Project",
        "description": "Installing filters in schools...",
        "goal": 25.0,
        "fundraiser_type": "public",
        "category": "Water",
        "people_affected": 1200
      }
      ```
    *   *Response JSON*:
      ```json
      { "message": "Fundraiser created", "fundraiserId": 12 }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Creates a new fundraiser in the database, associating it with the authenticated NGO's wallet address.
    *   *Why this design*: Associates campaigns with the NGO's wallet address to ensure donations can be routed correctly.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken & Role Gates            Fundraiser Controller             TiDB Engine
      |                             |                                  |                             |
      |-- POST /api/create -------->|                                  |                             |
      |                             |-- Verify JWT & Role "ngo" -------+                             |
      |                             |                                  |                             |
      |                             +--------------------------------->|                             |
      |                                                                |-- INSERT INTO fundraisers ->|
      |                                                                |<-- Return insertId (12) ----|
      |<-- 200 Created JSON -------------------------------------------+                             |
```

#### 11. List My NGO Fundraisers (`GET /api/my-fundraisers`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L25). Registered as `router.get("/api/my-fundraisers", verifyToken, requireRole("ngo"), getMyFundraisers)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('ngo')` → `getMyFundraisers` controller function → Database query → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("ngo")`: Restricts access to users with the `'ngo'` role.
*   **Controller**: `getMyFundraisers` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L88):
    *   Queries the `fundraisers` table to retrieve all campaigns owned by the authenticated user's wallet address (`req.user.wallet`).
    *   Aggregates total donations for each fundraiser, converting INR to ETH at a static rate.
*   **Database**:
    *   *Tables*: `fundraisers`, `donations`.
    *   *Query*:
      ```sql
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal, f.owner_wallet AS ownerWallet,
             f.fundraiser_type AS fundraiserType, f.category, f.people_affected AS peopleAffected, f.created_at, f.status,
             IFNULL(SUM(CASE WHEN d.currency = 'INR' THEN d.amount / 300000.0 ELSE d.amount END), 0) AS raised
      FROM fundraisers f LEFT JOIN donations d ON f.fundraiser_id = d.fundraiser_id
      WHERE f.owner_wallet = ? GROUP BY f.fundraiser_id;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("ngo")`. Queries are filtered using the authenticated user's wallet address (`req.user.wallet`) to prevent unauthorized access.
*   **Input & Output**:
    *   *Request*: Empty.
    *   *Response JSON*:
      ```json
      [
        {
          "fundraiserId": 1,
          "title": "Medical Supplies drive",
          "description": "Providing basic medical kits...",
          "goal": 15.5,
          "ownerWallet": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "fundraiserType": "public",
          "category": "Medical",
          "peopleAffected": 500,
          "status": "active",
          "raised": 2.45
        }
      ]
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves all campaigns created by the authenticated NGO, returning aggregated donation totals.
    *   *Why this design*: Ensures NGOs can only view and manage their own campaigns.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken & Role Gates            Fundraiser Controller             TiDB Engine
      |                             |                                  |                             |
      |-- GET /my-fundraisers ----->|                                  |                             |
      |                             |-- Verify JWT & Role "ngo" -------+                             |
      |                             |                                  |                             |
      |                             +--------------------------------->|                             |
      |                                                                |-- SELECT WHERE owner = ? -->|
      |                                                                |<-- Return List of Rows -----|
      |<-- 200 List JSON ----------------------------------------------+                             |
```

#### 12. Calculate Total Raised for Fundraiser (`GET /api/raised/:id`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L24). Registered as `router.get("/api/raised/:id", getTotalRaised)`.
*   **Pipeline**: Client → Route → `getTotalRaised` controller function → Database query with aggregation → Client response.
*   **Middleware**: None.
*   **Controller**: `getTotalRaised` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L110):
    *   Extracts the fundraiser ID from the path parameters.
    *   Queries the `donations` table to sum all donation amounts, converting INR to ETH at a static rate.
*   **Database**:
    *   *Tables*: `donations`
    *   *Query*:
      ```sql
      SELECT COALESCE(SUM(CASE WHEN currency = 'INR' THEN amount / 300000.0 ELSE amount END), 0) AS totalRaised
      FROM donations WHERE fundraiser_id = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint.
*   **Input & Output**:
    *   *Path Params*: `id` (integer)
    *   *Response JSON*:
      ```json
      { "totalRaised": 2.45 }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Computes the total funds raised for a specific fundraiser.
    *   *Why this design*: Keeps the query lightweight by avoiding joins and focusing strictly on the `donations` table.
*   **Sequence Diagram**:
```text
Client Browser            Fundraiser Controller            TiDB Database Engine
      |                             |                               |
      |-- GET /api/raised/1 ------->|                               |
      |                             |-- SELECT SUM(donations) ----->|
      |                             |<-- Return sum value ----------|
      |<-- 200 Sum JSON ------------+                               |
```

#### 13. Update Fundraiser Campaign Status (`PUT /api/fundraiser/:id/status`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L27). Registered as `router.put("/api/fundraiser/:id/status", verifyToken, requireRole("ngo"), updateFundraiserStatus)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('ngo')` → `updateFundraiserStatus` controller function → TiDB Cloud Update → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("ngo")`: Restricts access to users with the `'ngo'` role.
*   **Controller**: `updateFundraiserStatus` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L125):
    *   Extracts the fundraiser ID from the path parameters and the new status from the request body.
    *   Updates the fundraiser status if the authenticated user's wallet address (`req.user.wallet`) matches the fundraiser's `owner_wallet`.
*   **Database**:
    *   *Tables*: `fundraisers`
    *   *Query*:
      ```sql
      UPDATE fundraisers SET status = ? WHERE fundraiser_id = ? AND owner_wallet = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("ngo")`. The query filters by both `fundraiser_id` and `owner_wallet` to ensure that only the campaign owner can change its status.
*   **Input & Output**:
    *   *Path Params*: `id` (integer)
    *   *Request Body*:
      ```json
      { "status": "closed" }
      ```
    *   *Response JSON*:
      ```json
      { "success": true, "message": "Fundraiser status updated to closed" }
      ```
    *   *Error Response*:
        *   `403 Forbidden: You do not own this fundraiser or it does not exist`
*   **Interview Focus**:
    *   *30-Second Pitch*: Updates the status of a fundraiser, ensuring that only the campaign owner can close or activate it.
    *   *Why this design*: Restricts status changes using a single query filter instead of separate check and update queries, reducing database overhead.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken & Role Gates            Fundraiser Controller             TiDB Engine
      |                             |                                  |                             |
      |-- PUT /api/status/1 ------->|                                  |                             |
      |                             |-- Verify JWT & Role "ngo" -------+                             |
      |                             |                                  |                             |
      |                             +--------------------------------->|                             |
      |                                                                |-- UPDATE WHERE ID & owner ->|
      |                                                                |<-- Return affectedRows (1) -|
      |<-- 200 Success JSON -------------------------------------------+                             |
```

#### 14. Update Fundraiser Campaign Description (`PUT /api/fundraiser/:id/description`)
*   **Routing**: Defined inside [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js#L28). Registered as `router.put("/api/fundraiser/:id/description", verifyToken, requireRole("ngo"), updateFundraiserDescription)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('ngo')` → `updateFundraiserDescription` controller function → TiDB Cloud Update → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("ngo")`: Restricts access to users with the `'ngo'` role.
*   **Controller**: `updateFundraiserDescription` in [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js#L151):
    *   Extracts the fundraiser ID from the path parameters and the new description from the request body.
    *   Updates the fundraiser description if the authenticated user's wallet address (`req.user.wallet`) matches the fundraiser's `owner_wallet`.
*   **Database**:
    *   *Tables*: `fundraisers`
    *   *Query*:
      ```sql
      UPDATE fundraisers SET description = ? WHERE fundraiser_id = ? AND owner_wallet = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("ngo")`. The query filters by both `fundraiser_id` and `owner_wallet` to ensure that only the campaign owner can update the description.
*   **Input & Output**:
    *   *Path Params*: `id` (integer)
    *   *Request Body*:
      ```json
      { "description": "An updated description of the water project..." }
      ```
    *   *Response JSON*:
      ```json
      { "success": true, "message": "Description updated successfully" }
      ```
    *   *Error Response*:
        *   `403 Forbidden: You do not own this fundraiser or it does not exist`
*   **Interview Focus**:
    *   *30-Second Pitch*: Updates the description of a fundraiser, ensuring that only the campaign owner can modify it.
    *   *Why this design*: Restricts changes using a single query filter instead of separate check and update queries, reducing database overhead.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken & Role Gates            Fundraiser Controller             TiDB Engine
      |                             |                                  |                             |
      |-- PUT /api/desc/1 --------->|                                  |                             |
      |                             |-- Verify JWT & Role "ngo" -------+                             |
      |                             |                                  |                             |
      |                             +--------------------------------->|                             |
      |                                                                |-- UPDATE WHERE ID & owner ->|
      |                                                                |<-- Return affectedRows (1) -|
      |<-- 200 Success JSON -------------------------------------------+                             |
```

---

### Route Group D: Donation Tracking & Verification

#### 15. Record MetaMask Donation (`POST /api/donate`)
*   **Routing**: Defined inside [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L13). Registered as `router.post("/api/donate", verifyToken, requireRole("donor"), donate)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('donor')` → `donate` controller function → TiDB query checks → `recordDonation` service → `generateDonationHash` → `anchorDonation` on-chain (Ethers) → TiDB Update → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("donor")`: Restricts access to users with the `'donor'` role.
*   **Controller**: `donate` in [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L7):
    *   Validates and extracts parameters from the request body.
    *   Checks for duplicate transaction hashes (`tx_hash`) in the database.
    *   Calls the `recordDonation` service to save the donation in the database.
    *   Generates a deterministic Keccak256 hash representing the donation.
    *   Calls the `anchorDonation` service to anchor the hash on-chain.
    *   Updates the database record with the anchoring transaction hash.
*   **Database**:
    *   *Tables*: `donations`
    *   *Queries*:
      ```sql
      SELECT donation_id FROM donations WHERE tx_hash = ? LIMIT 1;
      INSERT INTO donations (fundraiser_id, donor_address, amount, tx_hash, payment_method, payment_reference, currency, donated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      UPDATE donations SET anchor_tx_hash = ? WHERE donation_id = ?;
      ```
*   **External Services**:
    *   *Ethereum Blockchain*: Sends a transaction to the `DonationProofRegistry` smart contract deployed on the Sepolia network to anchor the donation hash.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("donor")`. Duplicate checks are performed on `tx_hash` to prevent double-spending attacks or replay submissions.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      {
        "fundraiser_id": 1,
        "amount": "0.05",
        "tx_hash": "0x5a1b3c8d..."
      }
      ```
    *   *Response JSON*:
      ```json
      { "message": "Donation successful", "donationId": 104 }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Records a crypto donation in the database, generates a deterministic hash of the donation metadata, and anchors it on-chain using a registry smart contract.
    *   *Possible improvements*: Wrap the database insertion and update in a transaction block to handle failures gracefully, and verify the transaction on-chain via the RPC provider before recording it.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Gates             Donation Controller             TiDB Pool              Alchemy RPC Node
      |                           |                             |                           |                         |
      |-- POST /api/donate ------>|                             |                           |                         |
      |                           |-- Validate JWT & Donor -----+                           |                         |
      |                           |                             |                           |                         |
      |                           +---------------------------->|                           |                         |
      |                                                         |-- Check tx_hash --------->|                         |
      |                                                         |<-- Result Empty ----------|                         |
      |                                                         |                           |                         |
      |                                                         |-- recordDonation() ------>|                         |
      |                                                         |<-- Return InsertId (104) -|                         |
      |                                                         |                                                     |
      |                                                         |-- generateDonationHash()  |                         |
      |                                                         |-- anchorDonation() -------------------------------->|
      |                                                         |<-- Return anchorTxHash -----------------------------|
      |                                                         |                                                     |
      |                                                         |-- UPDATE anchor_tx_hash ->|                         |
      |                                                         |<-- Success ---------------|                         |
      |<-- 200 Success JSON ------------------------------------+                                                     |
```

#### 16. List My Donations (`GET /api/my-donations`)
*   **Routing**: Defined inside [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L14). Registered as `router.get("/api/my-donations", verifyToken, requireRole("donor"), myDonations)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('donor')` → `myDonations` controller function → Database query → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("donor")`: Restricts access to users with the `'donor'` role.
*   **Controller**: `myDonations` in [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L79):
    *   Queries the `donations` table joined with `fundraisers` to retrieve all donations made by the authenticated user's wallet address (`req.user.wallet`).
*   **Database**:
    *   *Tables*: `donations`, `fundraisers`.
    *   *Query*:
      ```sql
      SELECT d.*, f.title FROM donations d JOIN fundraisers f ON d.fundraiser_id = f.fundraiser_id WHERE d.donor_address = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("donor")`. Queries are filtered using the authenticated user's wallet address (`req.user.wallet`) to prevent unauthorized access.
*   **Input & Output**:
    *   *Request*: Empty.
    *   *Response JSON*:
      ```json
      [
        {
          "donation_id": 104,
          "fundraiser_id": 1,
          "donor_address": "0x9E758a0a9A...",
          "amount": "0.050000000000000000",
          "tx_hash": "0x5a1b3c8d...",
          "payment_method": "crypto",
          "payment_reference": "",
          "donated_at": "2026-07-21T01:00:00Z",
          "anchor_tx_hash": "0x26fa74ba...",
          "currency": "ETH",
          "title": "Medical Supplies drive"
        }
      ]
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves all donations made by the authenticated donor, joining with the `fundraisers` table to include fundraiser titles.
    *   *Why this design*: Restricts access by filtering queries using the authenticated user's wallet address.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken & Role Gates            Donation Controller             TiDB Engine
      |                             |                                  |                             |
      |-- GET /my-donations ------->|                                  |                             |
      |                             |-- Verify JWT & Role "donor" -----+                             |
      |                             |                                  |                             |
      |                             +--------------------------------->|                             |
      |                                                                |-- SELECT WHERE wallet = ? ->|
      |                                                                |<-- Return List of Rows -----|
      |<-- 200 List JSON ----------------------------------------------+                             |
```

#### 17. List Donations for Fundraiser (`GET /api/fundraiser/:id/donations`)
*   **Routing**: Defined inside [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js#L15). Registered as `router.get("/api/fundraiser/:id/donations", verifyToken, getFundraiserDonations)`.
*   **Pipeline**: Client → Route → `verifyToken` → `getFundraiserDonations` controller function → Database query → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
*   **Controller**: `getFundraiserDonations` in [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js#L95):
    *   Extracts the fundraiser ID from the path parameters.
    *   Queries the `donations` table joined with `users` to retrieve all donations for the fundraiser.
*   **Database**:
    *   *Tables*: `donations`, `users`.
    *   *Query*:
      ```sql
      SELECT d.*, u.name AS donor_name
      FROM donations d LEFT JOIN users u ON d.donor_address = u.wallet_address
      WHERE d.fundraiser_id = ? ORDER BY d.donated_at DESC;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken` to ensure only authenticated users can view detailed donation histories.
*   **Input & Output**:
    *   *Path Params*: `id` (integer)
    *   *Response JSON*:
      ```json
      [
        {
          "donation_id": 104,
          "fundraiser_id": 1,
          "donor_address": "0x9E758a0a9A...",
          "amount": "0.050000000000000000",
          "tx_hash": "0x5a1b3c8d...",
          "payment_method": "crypto",
          "payment_reference": "",
          "donated_at": "2026-07-21T01:00:00Z",
          "anchor_tx_hash": "0x26fa74ba...",
          "currency": "ETH",
          "donor_name": "Alex Smith"
        }
      ]
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves all donations made to a specific fundraiser, performing a left join to include donor names.
    *   *Why this design*: Sorts donations by date in descending order to display the most recent donations first.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Middleware            Donation Controller             TiDB Engine
      |                             |                               |                            |
      |-- GET /fundraiser/1/donations>|                             |                            |
      |                             |-- Verify JWT and token -------+                            |
      |                             |                               |                            |
      |                             +------------------------------>|                            |
      |                                                             |-- SELECT WHERE id = 1 ---->|
      |                                                             |<-- Return List of Rows ----|
      |<-- 200 List JSON -------------------------------------------+                            |
```

#### 18. Verify Donation Proof On-Chain (`GET /api/donation/:donationId/verify`)
*   **Routing**: Defined inside [donationVerification.routes.js](file:///d:/CampusChain/backend/routes/donationVerification.routes.js#L11). Registered as `router.get("/api/donation/:donationId/verify", verifyToken, requireRole("donor"), verifyDonationProof)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('donor')` → `verifyDonationProof` controller function → TiDB query → `generateDonationHash` → `verifyDonation` check (Ethers) → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("donor")`: Restricts access to users with the `'donor'` role.
*   **Controller**: `verifyDonationProof` in [donationVerification.controller.js](file:///d:/CampusChain/backend/controllers/donationVerification.controller.js#L8):
    *   Extracts the donation ID from the path parameters.
    *   Queries the `donations` table to verify the donation exists and is owned by the authenticated user's wallet address (`req.user.wallet`).
    *   Recomputes the deterministic Keccak256 hash using the database fields.
    *   Calls the `verifyDonation` service to check the proof status on-chain.
*   **Database**:
    *   *Tables*: `donations`
    *   *Query*:
      ```sql
      SELECT donation_id, fundraiser_id, donor_address, amount, payment_method, payment_reference, donated_at, anchor_tx_hash
      FROM donations WHERE donation_id = ? AND donor_address = ? LIMIT 1;
      ```
*   **External Services**:
    *   *Ethereum Blockchain*: Sends a read-only View call (`verifyDonation`) to the `DonationProofRegistry` smart contract deployed on the Sepolia network using Ethers.js.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("donor")`. Queries are filtered using the authenticated user's wallet address (`req.user.wallet`) to prevent donors from accessing or verifying other users' donations.
*   **Input & Output**:
    *   *Path Params*: `donationId` (integer)
    *   *Response JSON*:
      ```json
      {
        "verified": true,
        "donationHash": "0x6fbc0218...",
        "anchorTxHash": "0x26fa74ba...",
        "paymentMethod": "crypto",
        "paymentReference": ""
      }
      ```
    *   *Error Response*:
        *   `404 Donation not found`
*   **Interview Focus**:
    *   *30-Second Pitch*: Recomputes the cryptographic hash of a donation record and queries the smart contract to verify its authenticity on-chain.
    *   *Why this design*: Reads are free on the blockchain, allowing users to verify their donations without incurring gas fees.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Gates             Verification Controller           TiDB Engine          Alchemy RPC Node
      |                           |                              |                             |                      |
      |-- GET /verify/104 ------->|                              |                             |                      |
      |                           |-- Validate JWT & Role -------+                             |                      |
      |                           |                                                            |                      |
      |                           +----------------------------->|                             |                      |
      |                                                          |-- SELECT WHERE ID & owner ->|                      |
      |                                                          |<-- Return Metadata Row -----|                      |
      |                                                          |                                                    |
      |                                                          |-- generateDonationHash()    |                      |
      |                                                          |-- verifyDonation(hash) --------------------------->|
      |                                                          |<-- Return true/false from contract ----------------|
      |<-- 200 Verification JSON --------------------------------+                                                    |
```

---

### Route Group E: Comment Section

#### 19. Add Comment to Fundraiser (`POST /api/comment`)
*   **Routing**: Defined inside [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js#L22). Registered as `router.post("/api/comment", verifyToken, addComment)`.
*   **Pipeline**: Client → Route → `verifyToken` middleware → `addComment` controller function → TiDB Cloud Insert → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
*   **Controller**: `addComment` in [comment.controller.js](file:///d:/CampusChain/backend/controllers/comment.controller.js#L5):
    *   Validates that `fundraiser_id` and `comment_text` are present in the request body.
    *   Extracts the user's ID from `req.user.id`.
    *   Inserts the new comment record into the `comments` table.
*   **Database**:
    *   *Tables*: `comments`
    *   *Query*:
      ```sql
      INSERT INTO comments (fundraiser_id, user_id, comment_text, commented_at) VALUES (?, ?, ?, ?);
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken`. Associates comments with the authenticated user ID (`req.user.id`) to prevent users from spoofing identities.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      { "fundraiser_id": 1, "comment_text": "Supported! Best wishes." }
      ```
    *   *Response JSON*:
      ```json
      { "message": "Comment added" }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Saves a comment record in the database, associating it with the fundraiser and the authenticated user.
    *   *Possible improvements*: Implement input sanitization (e.g., using `validator`) to prevent Cross-Site Scripting (XSS) attacks.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Middleware             Comment Controller             TiDB Engine
      |                             |                               |                            |
      |-- POST /api/comment ------->|                               |                            |
      |                             |-- Verify JWT and token -------+                            |
      |                             |                               |                            |
      |                             +------------------------------>|                            |
      |                                                             |-- INSERT INTO comments --->|
      |                                                             |<-- Confirm Insertion ------|
      |<-- 200 Success JSON ----------------------------------------+                            |
```

#### 20. Retrieve Comments for Fundraiser (`GET /api/comments/:id`)
*   **Routing**: Defined inside [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js#L23). Registered as `router.get("/api/comments/:id", getComments)`.
*   **Pipeline**: Client → Route → `getComments` controller function → Database query → Client response.
*   **Middleware**: None.
*   **Controller**: `getComments` in [comment.controller.js](file:///d:/CampusChain/backend/controllers/comment.controller.js#L30):
    *   Extracts the fundraiser ID from the path parameters.
    *   Queries the `comments` table joined with `users` to retrieve all comments for the fundraiser.
*   **Database**:
    *   *Tables*: `comments`, `users`.
    *   *Query*:
      ```sql
      SELECT comments.comment_id, users.name, comments.comment_text, comments.commented_at AS created_at
      FROM comments JOIN users ON comments.user_id = users.id
      WHERE fundraiser_id = ? ORDER BY commented_at DESC;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Public endpoint.
*   **Input & Output**:
    *   *Path Params*: `id` (integer)
    *   *Response JSON*:
      ```json
      [
        {
          "comment_id": 5,
          "name": "Alex Smith",
          "comment_text": "Supported! Best wishes.",
          "created_at": "2026-07-21T01:00:00Z"
        }
      ]
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Retrieves all comments left on a specific fundraiser, joining with the `users` table to display commenter names.
    *   *Why this design*: Sorts comments by date in descending order to display the most recent feedback first.
*   **Sequence Diagram**:
```text
Client Browser            Comment Controller            TiDB Database Engine
      |                             |                               |
      |-- GET /api/comments/1 ----->|                               |
      |                             |-- SELECT JOIN query --------->|
      |                             |<-- Return List of Rows -------|
      |<-- 200 List JSON -----------+                               |
```

#### 21. Delete Comment (`DELETE /api/comments/:commentId`)
*   **Routing**: Defined inside [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js#L24). Registered as `router.delete("/api/comments/:commentId", verifyToken, deleteComment)`.
*   **Pipeline**: Client → Route → `verifyToken` middleware → `deleteComment` controller function → TiDB ownership check query → TiDB Delete query → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
*   **Controller**: `deleteComment` in [comment.controller.js](file:///d:/CampusChain/backend/controllers/comment.controller.js#L53):
    *   Extracts the comment ID from the path parameters.
    *   Queries the `comments` table joined with `fundraisers` to check ownership.
    *   Verifies that the authenticated user's wallet address (`req.user.wallet`) matches the fundraiser owner's wallet address (`owner_wallet`).
    *   Deletes the comment if the check passes.
*   **Database**:
    *   *Tables*: `comments`, `fundraisers`.
    *   *Queries*:
      ```sql
      SELECT c.comment_id, f.owner_wallet FROM comments c JOIN fundraisers f ON c.fundraiser_id = f.fundraiser_id WHERE c.comment_id = ?;
      DELETE FROM comments WHERE comment_id = ?;
      ```
*   **External Services**: None.
*   **Security & Authorization**: Protected by `verifyToken`. Restricts comment deletion to the campaign owner to ensure content moderation control.
*   **Input & Output**:
    *   *Path Params*: `commentId` (integer)
    *   *Response JSON*:
      ```json
      { "success": true, "message": "Comment deleted successfully" }
      ```
    *   *Error Responses*:
        *   `404 Comment not found`
        *   `403 Forbidden: You are not the owner of this fundraiser`
*   **Interview Focus**:
    *   *30-Second Pitch*: Deletes a comment, verifying that the authenticated user owns the associated fundraiser.
    *   *Why this design*: Employs a lookup query to verify ownership before deletion, preventing unauthorized users from removing comments.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Middleware            Comment Controller             TiDB Engine
      |                             |                               |                            |
      |-- DELETE /api/comment/5 --->|                               |                            |
      |                             |-- Verify JWT and token -------+                            |
      |                             |                               |                            |
      |                             +------------------------------>|                            |
      |                                                             |-- SELECT ownership check ->|
      |                                                             |<-- Return owner_wallet ----|
      |                                                             |                            |
      |                                                             |-- DELETE WHERE ID = 5 ---->|
      |                                                             |<-- Confirm deletion -------|
      |<-- 200 Success JSON ----------------------------------------+                            |
```

---

### Route Group F: Payment Gateway Integration

#### 22. Create Razorpay Order (`POST /api/razorpay/create-order`)
*   **Routing**: Defined inside [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js#L12). Registered as `router.post("/api/razorpay/create-order", verifyToken, requireRole("donor"), createOrder)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('donor')` → `createOrder` controller function → Razorpay API call → Client response.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("donor")`: Restricts access to users with the `'donor'` role.
*   **Controller**: `createOrder` in [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L165):
    *   Validates `amount` and `fundraiser_id` in the request body.
    *   Converts the amount to the smallest currency unit (paise: `amount * 100`).
    *   Sends a request to the Razorpay API to generate a checkout order.
*   **Database**: None.
*   **External Services**:
    *   *Razorpay Gateway*: Calls `razorpay.orders.create` to initialize the transaction order.
*   **Security & Authorization**: Protected by `verifyToken` and `requireRole("donor")`. Order amounts are calculated and formatted on the server to prevent front-end manipulation.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      { "amount": "150.00", "fundraiser_id": 1 }
      ```
    *   *Response JSON*:
      ```json
      {
        "order_id": "order_PnZ6Sdx...",
        "amount": 15000,
        "currency": "INR",
        "key_id": "rzp_test_T5aRD..."
      }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Generates a secure checkout order using the Razorpay API, converting amounts to paise to avoid float representation errors.
    *   *Why this design*: Order creation is handled on the server to prevent users from modifying amounts or parameters in the client checkout window.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Gates             Payment Controller            Razorpay Servers
      |                           |                              |                            |
      |-- POST /create-order ---->|                              |                            |
      |                           |-- Validate JWT & Donor ------+                            |
      |                           |                              |                            |
      |                           +----------------------------->|                            |
      |                                                          |-- orders.create(Paise) --->|
      |                                                          |<-- Return order metadata --|
      |<-- 201 Order JSON ---------------------------------------+                            |
```

#### 23. Verify Payment Signature & Record Donation (`POST /api/razorpay/verify`)
*   **Routing**: Defined inside [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js#L19). Registered as `router.post("/api/razorpay/verify", verifyToken, requireRole("donor"), verifyPayment)`.
*   **Pipeline**: Client → Route → `verifyToken` → `requireRole('donor')` → `verifyPayment` controller → HMAC verification → TiDB checks → `recordDonation` → `generateDonationHash` → `anchorDonation` on-chain (Ethers) → TiDB update → Client.
*   **Middleware**:
    *   `verifyToken`: Parses the JWT, verifies the signature, and sets `req.user`.
    *   `requireRole("donor")`: Restricts access to users with the `'donor'` role.
*   **Controller**: `verifyPayment` in [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js#L58):
    *   Validates and extracts Razorpay parameters.
    *   Recomputes the signature using the Razorpay secret and the HMAC-SHA256 algorithm.
    *   Compares the recomputed signature with the client's signature.
    *   Checks the database for duplicate payment references.
    *   Records the donation in the database.
    *   Generates a deterministic Keccak256 hash of the donation.
    *   Calls the `anchorDonation` service to anchor the hash on-chain.
    *   Updates the database record with the anchoring transaction hash.
*   **Database**:
    *   *Tables*: `donations`
    *   *Queries*:
      ```sql
      SELECT donation_id FROM donations WHERE payment_reference = ? LIMIT 1;
      INSERT INTO donations (fundraiser_id, donor_address, amount, tx_hash, payment_method, payment_reference, currency, donated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      UPDATE donations SET anchor_tx_hash = ? WHERE donation_id = ?;
      ```
*   **External Services**:
    *   *Razorpay Gateway*: Uses the webhook/signature verification secret key.
    *   *Ethereum Blockchain*: Sends a transaction to the `DonationProofRegistry` smart contract on the Sepolia network to anchor the donation hash.
*   **Security & Authorization**: Gated by `verifyToken` and `requireRole("donor")`. Signature checks are verified using a server-side secret key to prevent payment spoofing.
*   **Input & Output**:
    *   *Request Body*:
      ```json
      {
        "fundraiser_id": 1,
        "amount": "150.00",
        "razorpay_order_id": "order_PnZ6Sdx...",
        "razorpay_payment_id": "pay_PnZ7AdX...",
        "razorpay_signature": "0z6sdx1..."
      }
      ```
    *   *Response JSON*:
      ```json
      {
        "success": true,
        "verified": true,
        "payment_id": "pay_PnZ7AdX...",
        "order_id": "order_PnZ6Sdx...",
        "donationId": 105
      }
      ```
*   **Interview Focus**:
    *   *30-Second Pitch*: Verifies the cryptographic signature of a Razorpay payment, records the transaction in the database, and anchors the proof on-chain.
    *   *Why this design*: Decoupled database writes from blockchain updates to ensure that database transactions remain intact even if anchoring fails.
*   **Sequence Diagram**:
```text
Client Browser            verifyToken Gates             Payment Controller             TiDB Pool              Alchemy RPC Node
      |                           |                             |                           |                         |
      |-- POST /verify-payment -->|                             |                           |                         |
      |                           |-- Validate JWT & Donor -----+                           |                         |
      |                           |                             |                           |                         |
      |                           +---------------------------->|                           |                         |
      |                                                         |-- Check duplicates ------>|                         |
      |                                                         |<-- Result Empty ----------|                         |
      |                                                         |                           |                         |
      |                                                         |-- recordDonation() ------>|                         |
      |                                                         |<-- Return InsertId (105) -|                         |
      |                                                         |                                                     |
      |                                                         |-- generateDonationHash()  |                         |
      |                                                         |-- anchorDonation() -------------------------------->|
      |                                                         |<-- Return anchorTxHash -----------------------------|
      |                                                         |                                                     |
      |                                                         |-- UPDATE anchor_tx_hash ->|                         |
      |                                                         |<-- Success ---------------|                         |
      |<-- 200 Verification JSON -------------------------------+                                                     |
```

---

## 🗺️ Feature to API Mapping

| Feature | APIs Involved | File Paths |
| :--- | :--- | :--- |
| **Authentication Flow** | `POST /signup`, `POST /login` | [auth.routes.js](file:///d:/CampusChain/backend/routes/auth.routes.js), [auth.controller.js](file:///d:/CampusChain/backend/controllers/auth.controller.js) |
| **User Profile Management**| `GET /api/profile`, `PUT /api/profile/update` | [profile.routes.js](file:///d:/CampusChain/backend/routes/profile.routes.js), [profile.controller.js](file:///d:/CampusChain/backend/controllers/profile.controller.js) |
| **Fundraiser Exploration** | `GET /api/fundraisers`, `GET /api/fundraiser/:id`, `GET /api/raised/:id` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js), [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js) |
| **Fundraiser Creation** | `POST /api/fundraiser/create`, `GET /api/my-fundraisers` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js), [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js) |
| **Campaign Modifications** | `PUT /api/fundraiser/:id/status`, `PUT /api/fundraiser/:id/description` | [fundraiser.routes.js](file:///d:/CampusChain/backend/routes/fundraiser.routes.js), [fundraiser.controller.js](file:///d:/CampusChain/backend/controllers/fundraiser.controller.js) |
| **MetaMask Donation** | `POST /api/donate`, `GET /api/my-donations`, `GET /api/fundraiser/:id/donations` | [donation.routes.js](file:///d:/CampusChain/backend/routes/donation.routes.js), [donation.controller.js](file:///d:/CampusChain/backend/controllers/donation.controller.js), [donation.service.js](file:///d:/CampusChain/backend/services/donation.service.js) |
| **Razorpay Donation** | `POST /api/razorpay/create-order`, `POST /api/razorpay/verify` | [payment.routes.js](file:///d:/CampusChain/backend/routes/payment.routes.js), [payment.controller.js](file:///d:/CampusChain/backend/controllers/payment.controller.js) |
| **Audit Verification** | `GET /api/donation/:donationId/verify` | [donationVerification.routes.js](file:///d:/CampusChain/backend/routes/donationVerification.routes.js), [donationVerification.controller.js](file:///d:/CampusChain/backend/controllers/donationVerification.controller.js), [blockchain.service.js](file:///d:/CampusChain/backend/services/blockchain.service.js) |
| **Comment Threading** | `POST /api/comment`, `GET /api/comments/:id`, `DELETE /api/comments/:commentId` | [comment.routes.js](file:///d:/CampusChain/backend/routes/comment.routes.js), [comment.controller.js](file:///d:/CampusChain/backend/controllers/comment.controller.js) |

---

## 🎖️ Interview Focus & Importance Rankings

Below is the rank index of endpoints interviewers are most likely to ask about. Focus your preparation on these APIs.

1.  **`POST /api/razorpay/verify` (Rank 1 - Advanced)**:
    *   *Why:* Involves cryptographic signature verification, duplicate payment detection, database writes, and smart contract anchoring.
2.  **`POST /api/donate` (Rank 2 - Advanced)**:
    *   *Why:* Demonstrates how write transactions are recorded and verified on the blockchain, and highlights the trade-offs of storing database references vs. blockchain states.
3.  **`GET /api/donation/:donationId/verify` (Rank 3 - Medium)**:
    *   *Why:* Covers on-chain verification using view functions, explaining how off-chain data matches cryptographic hashes.
4.  **`POST /login` (Rank 4 - Medium)**:
    *   *Why:* Tests your understanding of stateless authentication, password hashing, and token signature verification.
5.  **`GET /api/fundraisers` (Rank 5 - Medium)**:
    *   *Why:* Covers relational queries, aggregation, and the implications of hardcoded database conversions.
