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

End of Changelog.