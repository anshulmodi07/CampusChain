# CampusChain Architecture

> Version: 2.x
>
> Last Updated: July 2026

---

# Purpose

This document describes the complete architecture of CampusChain.

It explains how requests flow through the system, how different services interact, why certain architectural decisions were made, and how future features will fit into the platform.

This document should be updated whenever the system architecture changes.

---

# High Level Overview

CampusChain is a hybrid Web2 + Web3 crowdfunding platform.

Users may donate through

• Ethereum (MetaMask)

or

• Razorpay (UPI / Card / NetBanking)

Both payment methods ultimately produce

Verified Donation

↓

Database Record

↓

Blockchain Proof

↓

Updated Fundraiser

The blockchain acts as the trust layer.

It is NOT the payment processor.

---

# Tech Stack

## Frontend

- HTML
- CSS
- Vanilla JavaScript
- ES Modules

---

## Backend

- Node.js
- Express.js

---

## Database

- TiDB Cloud
- MySQL Compatible

---

## Authentication

- JWT

---

## Blockchain

- Ethereum Sepolia
- ethers.js

---

## Payment Gateway

- Razorpay

---

## Deployment

Frontend

Netlify

Backend

AWS EC2

Reverse Proxy

Nginx

Process Manager

PM2

HTTPS

Let's Encrypt

---

# System Architecture

                Browser

                    │

                    ▼

         HTML / CSS / JavaScript

                    │

                    ▼

             Express Backend

                    │

      ┌─────────────┴─────────────┐

      ▼                           ▼

   TiDB Cloud              Ethereum

      │                           │

      └─────────────┬─────────────┘

                    ▼

              User Response

---

# Folder Structure

frontend/

Contains

- Pages
- JavaScript
- Styles
- Assets

Backend/

Contains

Controllers

Routes

Services

Middleware

Database

Blockchain

Utilities

---

# Request Lifecycle

Every request follows

Browser

↓

Route

↓

Middleware

↓

Controller

↓

Service

↓

Database / Blockchain

↓

Response

Business logic belongs inside Services.

Controllers remain lightweight.

---

# Authentication Flow

Signup

↓

Password Hashing

↓

Store User

↓

Login

↓

Verify Password

↓

Generate JWT

↓

Frontend Stores Token

↓

Authenticated Requests

↓

Authorization Middleware

---

# Fundraiser Flow

NGO Creates Campaign

↓

Validation

↓

Insert into Database

↓

Campaign Visible

↓

Donors Can Contribute

---

# MetaMask Donation Flow

User

↓

Connect Wallet

↓

Enter ETH

↓

Sign Transaction

↓

Ethereum

↓

Transaction Hash

↓

Backend Verification

↓

recordDonation()

↓

Store Donation

↓

Generate Donation Hash

↓

Anchor Proof

↓

Update Donation Record

↓

Return Success

---

# Razorpay Donation Flow

User

↓

Enter INR

↓

Create Razorpay Order

↓

Checkout Popup

↓

Payment

↓

Backend Signature Verification

↓

recordDonation()

↓

Store Donation

↓

Generate Donation Hash

↓

Anchor Proof

↓

Update Donation Record

↓

Return Success

---

# Hybrid Payment Model

CampusChain supports

Ethereum

AND

Razorpay

Both produce the same logical donation.

Payment Method

↓

Verification

↓

Database

↓

Blockchain Proof

↓

Fundraiser Update

---

# Canonical Currency

CampusChain stores fundraising goals in ETH.

Reason

Blockchain operates on Ethereum.

MetaMask uses ETH.

ETH is the immutable source of truth.

Razorpay donations are converted into ETH equivalent for fundraising progress.

Frontend may display INR equivalents for better usability.

---

# Database Layer

TiDB stores

Users

Fundraisers

Donations

Comments

Verification Records

Every successful donation creates a database record before blockchain anchoring.

---

# Blockchain Layer

Purpose

Transparency

Immutability

Auditability

Every verified donation generates

Donation Hash

↓

Ethereum Transaction

↓

Anchor Transaction Hash

↓

Stored in Database

---

# Services Layer

Business logic belongs inside Services.

Example

recordDonation()

Responsible for

Validation

Database Write

Currency Handling

Hash Generation

Anchor Trigger

Controllers should never implement business logic directly.

---

# Middleware Layer

Current Middleware

Authentication

Authorization

Error Handling

Future Middleware

Rate Limiting

Request Logging

Caching

Monitoring

---

# Error Handling

Every layer returns meaningful errors.

Avoid generic

500 Internal Server Error

Instead

Validation Failed

Signature Invalid

Authentication Failed

Database Error

Blockchain Error

---

# Deployment Architecture

Netlify

↓

Internet

↓

Nginx

↓

Express

↓

TiDB

↓

Ethereum

PM2 manages the Node.js process.

HTTPS is terminated by Nginx.

---

# Current Architecture Status

Authentication

✅ Complete

Fundraisers

✅ Complete

Comments

✅ Complete

MetaMask Donations

✅ Complete

Razorpay

🟡 Production Polish Remaining

Blockchain Anchoring

✅ Complete

Deployment

✅ Complete

---

# Future Architecture

Version 3

React

↓

Reusable Components

↓

State Management

---

Version 4

Redis

↓

Fundraiser Cache

↓

Comment Cache

↓

Session Cache

---

Version 5

Background Workers

↓

BullMQ

↓

Email Queue

↓

Notification Queue

↓

Blockchain Queue

---

Version 6

Monitoring

↓

Prometheus

↓

Grafana

↓

Structured Logging

---

Version 7

CI/CD

↓

GitHub Actions

↓

Automated Tests

↓

Deployment

---

# Engineering Principles

CampusChain follows

Frontend

↓

Backend

↓

Database

↓

Blockchain

Every layer has one responsibility.

Business logic remains centralized.

Architecture changes should be documented before implementation.

---

End of Architecture Document.