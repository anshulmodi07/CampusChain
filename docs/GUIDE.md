# CampusChain Development Guide

> Version: 2.x
> Last Updated: July 2026

---

# Purpose

This document is the development roadmap for CampusChain.

Unlike RULES.md (which defines engineering standards),
GUIDE.md defines

- what we are currently building
- why we are building it
- current version
- completed versions
- upcoming versions
- exit criteria
- testing requirements

Every AI assistant should read

RULES.md

↓

GUIDE.md

before modifying the codebase.

---

# Current Project Status

Project Name

CampusChain

Current Branch

campuschain-v2

Production Branch

main

Current Version

Version 2.8

Status

🟢 Completed

Current Goal

Freeze CampusChain Version 2.

---

# Current Architecture

Frontend

HTML

CSS

JavaScript (ES Modules)

↓

Node.js

↓

Express

↓

TiDB Cloud

↓

Ethereum Sepolia

Deployment

Frontend

↓

Netlify

Backend

↓

AWS EC2

↓

Nginx

↓

PM2

↓

HTTPS

↓

campuschain.online

---

# Current Features

Authentication

✅ Login

✅ Signup

JWT Authentication

Fundraisers

✅ Create

✅ Browse

✅ Donate

Comments

✅ Add Comments

✅ View Comments

Payments

✅ MetaMask

✅ Razorpay

Blockchain

✅ Ethereum

✅ Donation Anchoring

Infrastructure

✅ AWS

✅ Nginx

✅ PM2

✅ HTTPS

---

# Version Roadmap

Versions are completed sequentially.

Never skip versions.

Never begin Version N+1 before Version N is complete.
For each version, add:

Deliverables

Code Changes

↓

Testing

↓

Release Notes

↓

Commit
---

# Version 2.4

Title

Hybrid Payment Consistency

Status

🟢 Completed

Objective

Ensure MetaMask and Razorpay behave consistently throughout the application.

Tasks

☑ Fix ETH vs INR display

☑ Standardize contribution cards

☑ Dashboard totals

☑ Progress calculation

☑ Remove hardcoded currency assumptions

☑ Display INR equivalent beside ETH goal

Exit Criteria

✔ Every donation displays the correct currency.

✔ Dashboard totals are accurate.

✔ Progress bar behaves correctly.

✔ ETH remains canonical fundraising unit.

Testing

MetaMask Donation

↓

Dashboard

↓

Fundraiser

↓

Contribution History

Razorpay Donation

↓

Dashboard

↓

Fundraiser

↓

Contribution History

Documentation

Update

CHANGELOG.md

Commit

fix: standardize hybrid payment handling

---

# Version 2.5

Title

Dashboard Automation

Status

🟢 Completed

Objective

Remove unnecessary user interaction.

Tasks

☑ Auto-load campaigns

☑ Auto-load contributions

☑ Refresh fundraiser after donation

☑ Refresh donor dashboard

☑ Refresh NGO dashboard

Exit Criteria

Users never manually refresh data.

Documentation

CHANGELOG.md

Commit

feat: automate dashboard refresh workflow

---

# Version 2.6

Title

Timestamp Standardization

Status

🟢 Completed

Objective

Display consistent timestamps everywhere.

Tasks

☑ Standardize timezone

☑ Common formatting helper

☑ Fix Razorpay timestamps

☑ Fix MetaMask timestamps

Exit Criteria

All timestamps appear identical regardless of payment method.

Commit

fix: standardize timestamp formatting

---

# Version 2.7

Title

Production UX Polish

Status

🟢 Completed

Objective

Finish payment user experience.

Tasks

☑ Razorpay Test Mode banner

☑ Better success messages

☑ Better failure messages

☑ Disable buttons while processing

☑ Loading indicators

☑ Clear amount after success

☑ Re-enable buttons after failure

Exit Criteria

Professional payment experience.

Commit

feat: improve production payment UX

---

# Version 2.8

Title

Final QA

Status

🟢 Completed

Objective

Freeze CampusChain Version 2.

Testing Checklist

Authentication

☑ Login

☑ Signup

☑ Logout

Fundraisers

☑ Browse

☑ Create

☑ Donate

Comments

☑ Add

☑ Load

Payments

☑ MetaMask

☑ Razorpay

Blockchain

☑ Anchor Generation

Dashboards

☑ Donor

☑ NGO

Deployment

☑ AWS

☑ Netlify

☑ HTTPS

Regression

☑ No console errors

☑ No backend errors

☑ No database errors

Exit Criteria

CampusChain v2 ready for production merge.

Commit

test: complete production QA

---

# Merge Procedure

After Version 2.8

Local Testing

↓

Deploy AWS

↓

Verify Production

↓

Documentation

↓

Merge

↓

main

↓

Tag

v2.0.0

Only then is Version 2 complete.

---

# Future Versions

Version 3

React + Vite Migration

Goals

Reusable Components

Better State Management

Modern Frontend

---

Version 4

Redis Cache

Goals

Fundraiser caching

Comment caching

Performance

---

Version 5

Background Jobs

Goals

BullMQ

Notifications

Emails

Async Blockchain Tasks

---

Version 6

DevOps

Goals

Docker

GitHub Actions

Monitoring

Logging

Health Checks

---

# AI Agent Workflow

Every AI assistant should follow

Read

↓

RULES.md

↓

Read

↓

GUIDE.md

↓

Identify Current Version

↓

Work ONLY on Current Version

↓

Fix

↓

Test

↓

Document

↓

Commit

↓

Update GUIDE.md Status

↓

Stop

Never continue into the next version automatically.

---

# Completion Policy

A version is considered complete only when

✔ All tasks completed

✔ Testing passed

✔ Documentation updated

✔ Commit created

✔ Ready for deployment

Only then may development continue.

---

End of Development Guide.