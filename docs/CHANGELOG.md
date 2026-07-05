# Changelog

All notable changes to the CampusChain project will be documented in this file.

## [Unreleased]

### Fixed
- **Database Connection Reset (`ECONNRESET`) in Razorpay Checkout**:
  - **Issue**: Under production-like loads or idle periods, the database socket connection would be terminated by the AWS/TiDB cloud infrastructure (NAT Gateway / Network Load Balancer idle timeouts occur after 350 seconds). The database connection pool (`mysql2`) was unaware of the termination and tried to reuse the stale socket, throwing `read ECONNRESET` when executing the first query (`SELECT donation_id FROM donations...`) inside `verifyPayment`.
  - **Trace Results**: Verified that when the socket is closed, the tracer logs execute up to `[TRACER] 2. Signature verified`, but fail at the `SELECT` query before executing `[TRACER] 3. recordDonation entered` (making it the first log that never executes).
  - **Resolution**: Configured the database connection pool in [index.js](file:///d:/CampusChain/backend/db/index.js) with TCP keep-alive settings (`enableKeepAlive: true` and `keepAliveInitialDelay: 10000`) and idle connection timeouts (`idleTimeout: 60000` and `maxIdle: 10`). This ensures TCP keep-alive packets prevent the NAT Gateway from reaping idle connections, and stale connections are automatically re-established by the pool.
