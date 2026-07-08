# CampusChain Testing Protocol

> This document defines the mandatory testing workflow for every CampusChain version.

No version may be committed until this protocol completes successfully.

---

# Testing Philosophy

Testing is not the final step.

Testing is performed throughout development.

Every discovered issue must be

Investigated

↓

Root Cause Identified

↓

Fixed

↓

Retested

↓

Documented

↓

Regression Tested

↓

Committed

Never continue while known critical bugs remain.

---

# AI Testing Workflow

For every version:

1. Read RULES.md

2. Read GUIDE.md

3. Identify current version.

4. Implement only the current version.

5. Test only the current version.

6. If a bug is discovered

    Stop implementation.

    Investigate root cause.

    Fix.

    Retest.

    Document.

7. Continue until current version passes.

8. Perform regression testing.

9. Update CHANGELOG.md.

10. Commit.

11. Stop.

Never begin the next version automatically.

---

# Feature Testing

For every task in GUIDE.md

Repeat

Implement

↓

Verify

↓

Fix

↓

Verify Again

↓

Mark Complete

No task should be marked complete without verification.

---

# Bug Investigation

Every bug report must contain

Problem

Observed Behaviour

Expected Behaviour

Root Cause

Files Modified

Testing Performed

Result

No silent fixes.

---

# Regression Checklist

Authentication

☐ Login

☐ Signup

☐ Logout

☐ JWT

Fundraisers

☐ Create

☐ Browse

☐ Search

☐ Details

Donations

☐ MetaMask

☐ Razorpay

☐ Contribution History

☐ Dashboard

Comments

☐ Add

☐ Load

☐ Ordering

Dashboards

☐ Donor

☐ NGO

Blockchain

☐ Anchor

☐ Transaction

Database

☐ Insert

☐ Update

☐ Currency

☐ Payment Reference

☐ Anchor Hash

Deployment

☐ Backend

☐ Frontend

☐ HTTPS

☐ Database

---

# Version Completion Checklist

Before committing

Verify

☐ All tasks completed

☐ No frontend errors

☐ No backend errors

☐ No SQL errors

☐ No blockchain failures

☐ Regression testing passed

☐ Documentation updated

☐ CHANGELOG updated

☐ GUIDE updated

Only then create a commit.

---

# Commit Policy

After testing

↓

Commit

↓

Stop

Do not continue to the next version.

Wait for manual approval.

---

# AWS Verification

AWS deployment is performed only after the entire roadmap version is complete.

AWS deployment is NOT performed after every intermediate version.

Example

Version 2.4

↓

Commit

Version 2.5

↓

Commit

Version 2.6

↓

Commit

Version 2.7

↓

Commit

Version 2.8

↓

Complete QA

↓

Deploy AWS

↓

Verify Production

↓

Manual Merge

↓

main

Only the project owner may merge to main.

---

# Failure Policy

If testing fails

Do not commit.

Do not continue.

Document

Problem

Root Cause

Current Status

Wait until issue is resolved.

---

End of Testing Protocol.