# API Endpoints Documentation

All requests expect headers configured with authentication tokens when hitting protected routes:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication

### `POST /api/auth/signup`
Creates a new account.
* **Payload**:
  ```json
  {
    "name": "Anshul Modi",
    "email": "donor@gmail.com",
    "password": "123",
    "role": "donor",
    "wallet_address": "0x123..."
  }
  ```
* **Response (200 OK)**:
  ```json
  { "message": "User registered" }
  ```

### `POST /api/auth/login`
Authenticates a user and returns a token.
* **Payload**:
  ```json
  {
    "email": "donor@gmail.com",
    "password": "123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "name": "Anshul Modi",
      "email": "donor@gmail.com",
      "role": "donor",
      "wallet_address": "0x123..."
    }
  }
  ```

---

## 2. Fundraisers

### `GET /api/fundraisers`
Fetches a list of all active fundraisers.
* **Response (200 OK)**:
  ```json
  [
    {
      "fundraiser_id": 1,
      "title": "Scholarship Drive",
      "description": "Helping students in need",
      "goal": "5.500000000000000000",
      "owner_wallet": "0x123...",
      "fundraiser_type": "public",
      "category": "Education",
      "people_affected": 15,
      "created_at": "2026-07-01T00:00:00.000Z",
      "amountRaised": "1.200000000000000000"
    }
  ]
  ```

### `GET /api/fundraisers/:id`
Fetches a single fundraiser profile.

---

## 3. Comments

### `GET /api/comments/:fundraiserId`
Fetches all comments/messages for a fundraiser, sorted by `created_at` descending.
* **Response (200 OK)**:
  ```json
  [
    {
      "name": "Anshul Modi",
      "comment_text": "Good luck with this campaign!",
      "created_at": "2026-07-06T02:00:00.000Z"
    }
  ]
  ```

### `POST /api/comment` [Protected: Requires Auth]
Submits a comment message.
* **Payload**:
  ```json
  {
    "fundraiser_id": 1,
    "comment_text": "Showing my support!"
  }
  ```

---

## 4. Payments (Razorpay)

### `POST /api/razorpay/create-order` [Protected: Donor Only]
Creates an order with Razorpay to trigger client checkout popup.
* **Payload**:
  ```json
  {
    "fundraiser_id": 1,
    "amount": 3000
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "orderId": "order_xyz123",
    "amount": 300000,
    "currency": "INR"
  }
  ```

### `POST /api/razorpay/verify` [Protected: Donor Only]
Verifies the signature from Razorpay checkout and records the donation in the backend database.
* **Payload**:
  ```json
  {
    "fundraiser_id": 1,
    "amount": 3000,
    "razorpay_order_id": "order_xyz123",
    "razorpay_payment_id": "pay_abc789",
    "razorpay_signature": "signature_hash"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "verified": true,
    "payment_id": "pay_abc789",
    "order_id": "order_xyz123",
    "donationId": 12
  }
  ```
