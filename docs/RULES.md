# CampusChain Engineering Rules

> Version: 1.0
> Last Updated: July 2026

---

# Purpose

CampusChain is **not** a college CRUD project.

It is developed as a production-grade software product.

Every feature, bug fix and architectural decision should improve the long-term quality of the system.

The objective is not to ship features quickly.

The objective is to evolve CampusChain like software maintained by a professional engineering team.

---

# Core Principles

Every change must satisfy at least one of the following:

- Improves correctness
- Improves maintainability
- Improves scalability
- Improves security
- Improves developer experience
- Improves user experience

If a change satisfies none of the above,
it probably should not exist.

---

# Engineering Philosophy

We follow

Think
↓

Design
↓

Implement
↓

Verify
↓

Document
↓

Commit

Never

Think
↓

Code
↓

Hope

---

# Branch Strategy

main

Production branch.

Never develop directly on main.

Only merge fully verified versions.

campuschain-v2

Current development branch.

All work happens here until Version 2 is frozen.

Future versions may use

campuschain-v3

campuschain-v4

etc.

---

# Development Workflow

Every version follows exactly this order.

Step 1

Understand the problem.

Do not write code yet.

Investigate.

---

Step 2

Find the root cause.

Never patch symptoms.

Always answer

Why did this happen?

before

How do we fix it?

---

Step 3

Understand current architecture.

Before modifying code understand

Frontend

↓

API

↓

Controller

↓

Service

↓

Database

↓

Blockchain

Never modify code you don't understand.

---

Step 4

Design the solution.

Think about

Maintainability

Performance

Scalability

Future roadmap

Do not begin implementation until architecture is clear.

---

Step 5

Implementation.

Prefer

small

readable

reusable

changes.

Avoid duplicate code.

Avoid temporary hacks.

---

Step 6

Testing.

Test the feature locally.

Verify expected behavior.

Fix discovered bugs.

---

Step 7

Regression Testing.

Ensure existing features still work.

Every version must verify

Authentication

Fundraisers

Comments

MetaMask

Razorpay

Dashboards

Profiles

Deployment

No regressions are allowed.

---

Step 8

Documentation.

Documentation is mandatory.

Update

docs/CHANGELOG.md

before committing.

---

Step 9

Commit.

Only commit after

Implementation

Testing

Documentation

are complete.

---

# Root Cause Analysis

Every bug investigation must answer

What happened?

Why did it happen?

Why didn't previous code prevent it?

How does the new solution fix it?

How can this be prevented again?

If these questions cannot be answered,

the investigation is incomplete.

---

# Coding Rules

Write readable code.

Avoid unnecessary cleverness.

Prefer descriptive names.

Do not duplicate logic.

Reuse existing services whenever possible.

Remove dead code.

Remove temporary debugging code before merge.

No hardcoded URLs.

No hardcoded secrets.

No unnecessary console.log statements.

---

# Database Rules

Database modifications are high impact.

Never change schema without understanding consequences.

Before every schema modification

Document

Reason

Migration

Rollback strategy

Affected APIs

Affected UI

Never silently modify production data.

---

# API Rules

Every API change should answer

What changed?

Who consumes it?

Does it break compatibility?

Can existing clients continue working?

---

# Frontend Rules

Frontend should never contain

Business logic

Authentication logic

Database assumptions

Blockchain logic

Frontend displays information.

Backend owns business rules.

---

# Backend Rules

Controllers

↓

Validate request

↓

Call services

↓

Return response

Services contain business logic.

Controllers should remain thin.

---

# Blockchain Rules

Ethereum is the trust layer.

Not the payment processor.

MetaMask

↓

Blockchain

↓

recordDonation()

Razorpay

↓

Verify Signature

↓

recordDonation()

↓

Blockchain Anchor

All donations eventually produce

Blockchain proof.

---

# Hybrid Payment Rules

CampusChain supports

MetaMask

ETH

and

Razorpay

INR

Internally

ETH remains the canonical fundraising unit.

INR donations are converted to ETH equivalent for fundraising progress.

Never create separate fundraising goals for ETH and INR.

---

## Version Documentation

Every completed roadmap version must produce a detailed engineering report.

Engineering reports are stored in:

docs/releases/

Example

docs/releases/v2.4.md

Each report must contain:

- Version
- Objective
- Features Implemented
- Problems Found
- Root Cause Analysis
- Solution
- Files Modified
- Database Changes
- API Changes
- Architecture Impact
- Testing Performed
- Regression Testing
- Remaining TODO
- Lessons Learned
- Proposed Commit Message

The engineering report is mandatory before requesting approval for a commit.
# Commit Rules

Never commit broken code.

Never commit without testing.

Never commit undocumented work.

Commit messages should describe

purpose

not implementation.

Good

feat: integrate hybrid Razorpay donation flow

Bad

fixed stuff

---

# AI Agent Rules

Every AI assistant must

Understand current implementation

Investigate root cause

Explain findings

Implement

Test

Document

Commit

Never modify unrelated files.

Never silently modify SQL schema.

Never remove functionality without explanation.

Always preserve project architecture.

---
## Important

The AI assistant is NEVER allowed to merge branches.

The AI assistant is NEVER allowed to push directly to `main`.

The AI assistant may only:

- modify code
- test
- document
- create local commits

Merge decisions are made manually by the project owner after production verification.

# Definition of Done

A version is complete only if

☐ Feature implemented

☐ Root cause documented

☐ Local testing passed

☐ Regression testing passed

☐ No console errors

☐ No backend errors

☐ Documentation updated

☐ CHANGELOG updated

☐ Commit created

☐ Ready for deployment

If any item is unchecked,

the version is not complete.

---

# Deployment Rules

Development

↓

Local Verification

↓

AWS Deployment

↓

Production Verification

↓

Merge to main

Never merge unverified code.

---

# Anti Patterns

Never

Fix without investigation

Hardcode URLs

Duplicate code

Skip testing

Skip documentation

Commit broken code

Modify production directly

Mix unrelated features

Start next version before current version finishes

---

# Long Term Roadmap

Version 2

Hybrid Payments

Version 3

React Migration

Version 4

Redis Cache

Version 5

Background Jobs

Version 6

Docker

CI/CD

Monitoring

CampusChain should evolve one stable version at a time.

Quality is always preferred over speed.

---

End of Engineering Rules.