    # CampusChain AI Workflow

> Version: 1.0
> Last Updated: July 2026

---

# Purpose

This document defines how AI assistants (Claude, Antigravity, Gemini, Blackbox, ChatGPT, etc.) should contribute to CampusChain.

AI assistants are expected to behave like software engineers working on a professional production codebase.

They must follow the project engineering standards defined in:

1. RULES.md
2. GUIDE.md
3. TESTING.md

before making any modifications.

---

# Startup Procedure

Before writing a single line of code the AI assistant must:

1. Read RULES.md.
2. Read GUIDE.md.
3. Identify the current version.
4. Understand the objective.
5. Understand the existing implementation.
6. Identify dependencies.
7. Begin investigation.

Never start coding immediately.

---

# Working Scope

The AI assistant must only work on the CURRENT version listed in GUIDE.md.

Example

Current Version

Version 2.4

Allowed

✓ Version 2.4 tasks

Not Allowed

✗ Version 2.5
✗ Version 2.6
✗ React migration
✗ Redis
✗ Docker

Future roadmap items are ignored until manually approved.

---

# Engineering Workflow

Every task follows this lifecycle.

Understand

↓

Investigate

↓

Find Root Cause

↓

Design Solution

↓

Implement

↓

Test

↓

Regression Test

↓

Document

↓

Commit

↓

Stop

The assistant must stop after committing.

Never continue into the next roadmap version automatically.

---

# Root Cause Analysis

Every bug investigation must answer

1. What is broken?

2. Why is it broken?

3. Which component is responsible?

4. Why did the previous implementation fail?

5. How does the new solution fix the problem?

6. How can this issue be prevented in the future?

Temporary fixes are not acceptable.

---

# Implementation Rules

The AI assistant should

✓ Write maintainable code.

✓ Preserve architecture.

✓ Prefer reusable solutions.

✓ Keep controllers thin.

✓ Reuse services.

✓ Avoid duplicate logic.

✓ Remove obsolete code.

The assistant should never

✗ Rewrite unrelated modules.

✗ Introduce unnecessary dependencies.

✗ Mix multiple roadmap versions.

✗ Change architecture without explanation.

---

# Database Rules

Database modifications require extra care.

Before changing schema

Document

Reason

Migration

Rollback strategy

Affected APIs

Affected UI

Never modify production data silently.

Never perform destructive migrations without documentation.

---

# Documentation

After completing a version the AI assistant must

1. Update

docs/releases/vX.Y.md

with a detailed engineering report.

2. Update

docs/CHANGELOG.md

with

- Version
- Summary
- Status
- Link to release document
- Proposed commit message

3. Present the report to the project owner.

4. Wait for approval.

Do not commit automatically.

# Testing Rules

After implementation

Run feature testing.

If feature testing passes

Run regression testing.

Verify

Authentication

Fundraisers

Comments

MetaMask

Razorpay

Dashboards

Profiles

Deployment

If any regression appears

Stop.

Fix.

Retest.

---

# Logging

Every completed version should produce a short engineering summary.

Template

Version

Objective

Problems Found

Root Cause

Solution

Files Modified

Testing

Result

Commit Message

This summary should also be appended to CHANGELOG.md.

---

# Commit Policy

The AI assistant may create local Git commits.

The AI assistant must NOT

Merge branches

Push to production

Modify main

Delete history

Rewrite commits

Commit only after

Implementation complete

Testing complete

Documentation complete

---

# Merge Policy

Merge decisions belong to the project owner.

The AI assistant must never merge.

Workflow

Feature Branch

↓

Implementation

↓

Testing

↓

Documentation

↓

Commit

↓

STOP

The human decides when to deploy and merge.

---

# AWS Policy

The AI assistant should not deploy automatically.

Deployment is performed only after

Version completion

↓

Manual approval

↓

AWS verification

↓

Production verification

↓

Merge

---

# Failure Policy

If implementation fails

Stop immediately.

Document

Problem

Current findings

Files inspected

Root cause (if known)

Possible solutions

Do not continue blindly.

---

# Communication Style

Every completed task should include

What changed

Why it changed

Files modified

Architecture impact

Testing performed

Remaining work

Avoid vague responses.

Always explain engineering decisions.

---

# Definition of Success

The current version is complete only when

✓ Feature implemented

✓ Root cause documented

✓ Testing passed

✓ Regression passed

✓ Documentation updated

✓ CHANGELOG updated

✓ Local commit created

Only then should the assistant stop.

---

# Final Rule

The AI assistant is an engineer.

Not an autocomplete tool.

Think first.

Code second.

Document always.

---

End of AI Workflow.