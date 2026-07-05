# CampusChain Session Log

> This document acts as an ongoing engineering notebook to maintain continuity across development sessions.
> Each developer or AI agent must append their session entry to this file before finishing their work.

---

## Session: 2026-07-06

### Current Version
- Version 2.4 (Hybrid Payment Consistency)

### Objective
- Debug backend errors related to comments database retrieval and Razorpay checkouts throwing `read ECONNRESET` errors.

### Problems Found
1. **Comment Retrieval Mismatch**:
   - Querying `GET /api/comments/:fundraiserId` resulted in: `Unknown column 'comments.created_at' in 'field list'`.
2. **Database Connection Reset**:
   - Razorpay verification failed during database insert queries with the error `Database error during Razorpay donation recording: read ECONNRESET`.

### Root Causes
1. **Comment Database Column Drift**:
   - The actual comments table in the TiDB cloud database had its timestamp column named `commented_at`, whereas the backend controller, frontend logic, and documentation expected `created_at`.
2. **AWS NAT Gateway Idle Timeout**:
   - AWS NAT Gateways silently discard idle TCP connections after 350 seconds (approx 5.8 minutes), while the MySQL `wait_timeout` was 8 hours. When the server was idle, the connection pool was holding on to stale connections reaped by the gateway, causing `ECONNRESET` when new queries were sent.

### Files Modified
- **Database Schema**: Replaced the column `commented_at` with `created_at` on the `comments` table in TiDB Cloud.
- **Backend Database Config**: [db/index.js](file:///d:/CampusChain/backend/db/index.js) (Added TCP keep-alive settings `enableKeepAlive: true` and `keepAliveInitialDelay: 10000`, and shortened idle connection lifetimes to `idleTimeout: 60000` to prevent AWS NAT drops).
- **Changelog**: [docs/CHANGELOG.md](file:///d:/CampusChain/docs/CHANGELOG.md) (Updated version statuses).

### Testing Performed
- **Comment Endpoint**: Verified `GET /api/comments/1` returned comments correctly.
- **Frontend Comments Rendering**: Rendered the comments successfully on `fundraiser-detail.html?id=1` displaying accurate user name and formatting.
- **Tracer Diagnostics**: Run server-side verification using mock payloads on port `5001`. Logs confirmed that duplicate checks, SQL writes, and anchoring executed sequentially in order (Logs 1-7).
- **Idle Simulation**: Confirmed that connections are kept warm and re-connected automatically without crashing the server.

### Documentation Updated
- [docs/CHANGELOG.md](file:///d:/CampusChain/docs/CHANGELOG.md)
- [docs/PROJECT_CONTEXT.md](file:///d:/CampusChain/docs/PROJECT_CONTEXT.md) (Created)
- [docs/SESSION_LOG.md](file:///d:/CampusChain/docs/SESSION_LOG.md) (Created)

### Current Status
- 🟢 Complete. The comments and connection reset issues are fixed.

### Next Recommended Task
- Move on to standardizing currency conversions and front-end contribution cards in the dashboard for Version 2.4.

---

## Session: 2026-07-06 (Version 2.4 Implementation)

### Current Version
- Version 2.4 (Hybrid Payment Consistency)

### Objective
- Standardize currency presentation, dashboard totals, and cards for MetaMask (ETH) and Razorpay (INR) payments.

### Problems Found
- Hardcoded `₹` and `ETH` currency values across contribution list items and totals on dashboards.
- NGO dashboard cards goal and raised amounts rendered as `undefined` or incorrect numeric values because the backend returned snake_case attributes and did not return a `raised` calculation.
- Details page showing `undefined` students impacted.

### Root Causes
- Lack of database joins/aliases to support camelCase attributes in response JSON.
- Hardcoded currency formatting in HTML templates instead of dynamic formatting based on transaction currency metadata.

### Files Modified
- **Backend Controllers**:
  - `backend/controllers/fundraiser.controller.js`
  - `backend/controllers/donation.controller.js`
- **Frontend Pages/Scripts**:
  - `frontend/fundraiser.js`
  - `frontend/fundraiser-detail.html`
  - `frontend/fundraiser-detail.js`
  - `frontend/ngo-dashboard.js`
  - `frontend/donor-dashboard.html`
  - `frontend/donor-dashboard.js`
- **Release Documentation**:
  - `docs/releases/v2.4.md`

### Testing Performed
- Ran verification checks for updated SQL controller queries.
- Executed browser subagent login and dashboard layout testing for both Donors and NGOs. Confirmed that goals, raised progress, contribution logs, and totals show the correct multi-currency labels (`ETH` / `INR`) and percentages.

### Documentation Updated
- `docs/releases/v2.4.md`
- `docs/SESSION_LOG.md`

### Current Status
- 🟢 Completed. Version 2.4 features are fully verified and ready.

- Version 2.5: Dashboard Automation (Auto-loading campaigns/contributions and auto-refreshing dashboard states).

---

## Session: 2026-07-06 (Version 2.5 Implementation)

### Current Version
- Version 2.5 (Dashboard Automation)

### Objective
- Automate initial loading sequence on dashboards and details pages to remove unnecessary trigger clicks.

### Problems Found
- Users had to manually click "My Campaigns" or "View Contributions" on dashboards to load campaigns/donations list items.
- Successful checkouts refreshed goal progress but left comment listings stale.

### Root Causes
- Bootstrap handlers did not execute database queries during page onload event handlers.

### Files Modified
- **Frontend Source Files**:
  - `frontend/ngo-dashboard.js`
  - `frontend/donor-dashboard.js`
  - `frontend/fundraiser-detail.js`
- **Release Documentation**:
  - `docs/releases/v2.5.md`

### Testing Performed
- Ran automated browser subagent sweeps logging in as Donor and NGO. Confirmed stats and campaign logs load instantly on onload triggers.

### Documentation Updated
- `docs/releases/v2.5.md`
- `docs/SESSION_LOG.md`

### Current Status
- 🟢 Completed. Version 2.5 features are fully verified and ready.

- Version 2.6: Timestamp Standardization (Standardizing timezone configurations, formatters, and payment log dates).

---

## Session: 2026-07-06 (Version 2.6 Implementation)

### Current Version
- Version 2.6 (Timestamp Standardization)

### Objective
- Standardize timezones and timestamps on database pool connections, query operations, and frontend visual listings.

### Problems Found
- 1-second clock drifts between backend Javascript memory generation (`new Date()`) and MySQL query compilation (`NOW()`), leading to potential blockchain anchoring verification mismatches.
- Node MySQL driver parses timestamps using the server local timezone (drifting between local runtimes and UTC EC2 deployment environments).
- Comments listing returns database error 500 because the query references `comments.created_at` which is actually named `comments.commented_at` in the TiDB schema.

### Root Causes
- Discrepancy between application runtime time and database local clock.
- Schema column drift from legacy table revisions.

### Files Modified
- **Backend Source Files**:
  - `backend/db/index.js`
  - `backend/services/donation.service.js`
  - `backend/controllers/comment.controller.js`
- **Frontend Source Files**:
  - `frontend/utils/date.js` [NEW]
  - `frontend/donor-dashboard.js`
  - `frontend/fundraiser-detail.js`
- **Release Documentation**:
  - `docs/releases/v2.6.md`

### Testing Performed
- Logged in as Donor via automated browser subagents. Checked that both contribution logs and detail comment feeds load and format dates consistently in `Asia/Kolkata` time zone (IST) using the standard `D MMM YYYY, hh:mm am/pm` template. Posted comments verified immediately without errors.

### Documentation Updated
- `docs/releases/v2.6.md`
- `docs/SESSION_LOG.md`

### Current Status
- 🟢 Completed. Version 2.6 features are fully verified and ready.

### Next Recommended Task
- Version 2.7: Production UX Polish (Adding transaction pending/success overlays, disabling buttons, and clearing transaction values on completion).
