# CampusChain Changelog

> This document records every completed version of CampusChain.

Unlike git commits, this explains **why** changes were made, not only **what** changed.

Every completed version must append a new entry.

Never overwrite previous versions.

---

# Changelog Template

---

## Version X.Y

### Status

Completed

### Date

YYYY-MM-DD

### Objective

Describe the goal of this version.

---

## Problems Identified

List every issue discovered before implementation.

Example

- Incorrect ETH/INR display
- Dashboard totals inconsistent
- Manual refresh required

---

## Root Cause Analysis

Explain why the issue existed.

Do not simply describe the bug.

Explain the architectural reason.

---

## Solution

Describe how the issue was solved.

Focus on design decisions.

---

## Files Modified

Frontend

-

-

Backend

-

-

Database

-

Documentation

-

---

## Database Changes

List migrations.

Explain why they were necessary.

If none

Write

No database changes.

---

## API Changes

List modified endpoints.

Request changes.

Response changes.

Compatibility impact.

---

## Architecture Impact

Explain whether architecture changed.

If yes

Describe it.

If no

Write

Architecture unchanged.

---

## Testing Performed

List everything tested.

Example

✔ MetaMask donation

✔ Razorpay donation

✔ Dashboard

✔ Comments

✔ Login

✔ Signup

✔ AWS Deployment

---

## Regression Testing

Verify existing features.

Authentication

Fundraisers

Comments

Payments

Deployment

Profiles

Dashboards

---

## Result

Summarize the completed version.

---

## Remaining TODO

List work intentionally deferred to the next version.

---

## Commit

Record the commit message.

Example

feat: improve hybrid payment consistency

---

# Current Versions

## Version 2.4

Status

Completed

Summary

- Fixed hybrid payment consistency.
- Standardized currency handling.
- Updated dashboard totals.

Detailed Engineering Report

docs/releases/v2.4.md

Commit

fix: standardize hybrid payment handling

---

## Version 2.5

Status

Completed

Summary

- Auto-load campaigns list on NGO Dashboard window load.
- Auto-load contributions list and stats on Donor Dashboard window load.
- Refresh comments alongside campaign metrics on donation success.

Detailed Engineering Report

docs/releases/v2.5.md

Commit

feat: automate dashboard refresh workflow

---

## Version 2.6

Status

Completed

Summary

- Configured database connection pool to parse dates in UTC (`timezone: 'Z'`).
- Parameterized write timestamps using JavaScript Date objects to prevent clock drifts.
- Standardized comment controller queries to target `commented_at` and alias to `created_at`.
- Created frontend `formatTimestamp` helper standardizing display timezone to `Asia/Kolkata`.
- Added Test Donor and Test NGO buttons on login screen for automatic autofill and submit.

Detailed Engineering Report

docs/releases/v2.6.md

Commit

fix: standardize timezone, timestamps, and add test login buttons

---

## Version 2.7

Status

Completed

Summary

- Added Test Mode warning banner inside Razorpay donation card.
- Implemented CSS styles for success, error, and pending feedback states for `#donationMsg`.
- Replaced intrusive alert popups with styled inline message cards.
- Configured buttons to disable, show loading text, and clear input fields upon success.

Detailed Engineering Report

docs/releases/v2.7.md

Commit

fix: polish payment UX

---

## Version 2.8

Status

Completed

Summary

- Completed complete QA testing checklists across authentication, fundraisers, comments, payments, dashboards, and configurations.
- Froze all CampusChain Version 2 development milestones.

Detailed Engineering Report

docs/releases/v2.8.md

Commit

test: complete production QA

---

## Version 2.8 Part 2

Status

Completed

Summary

- Restricted connected wallet display to valid Ethereum hex address formats (`/^0x[a-fA-F0-9]{40}$/`).
- Aggregated stats count for unique campaigns supported rather than transaction counts.
- Hidden campaign support/payment cards on detail views for NGO role accounts.
- Configured MetaMask installation download links redirection for missing extensions.

Detailed Engineering Report

docs/releases/v2.8.2.md

Commit

fix: address leaks, campaigns count, and NGO payment exclusions

End of Changelog.