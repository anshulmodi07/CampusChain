# Architectural Decisions (ADR)

This document records the core architectural decisions (ADRs) made for the CampusChain project, along with their context and implications.

---

## ADR 1: Hybrid Payment Model (Web2 + Web3 Integration)

### Context
Donors at universities may not always have active cryptocurrency wallets or Sepolia test tokens. To maximize fundraiser reach, we need to support traditional payments (Razorpay) alongside Web3 wallets (MetaMask).

### Decision
Implement a hybrid payment gateway architecture. Donors can select between MetaMask (paying in ETH) or Razorpay (paying in INR).
* MetaMask transactions are processed directly on-chain.
* Razorpay transactions are processed in Web2, signature-verified in the backend, and then anchored to the blockchain.

### Implications
* Maintain a database to unify donation logs.
* Ensure both MetaMask and Razorpay routes yield a cryptographic proof anchored to the blockchain to preserve trust and transparency.

---

## ADR 2: Canonical Currency and Dynamically Converted Progress

### Context
Fundraising targets are hosted on Ethereum smart contracts which natively operate in `wei` (ETH). Mixing currencies in targets would split campaigns and cause architectural fragmentation.

### Decision
ETH is designated as the application's canonical unit of target value.
* All fundraiser targets are created and stored in ETH.
* Donations made in INR via Razorpay are converted to their ETH equivalent for progress calculations using a static exchange rate: `1 ETH = 300,000 INR`.
* The frontend handles dynamic presentation, formatting INR totals alongside the immutable ETH goals for readability.

### Implications
* Simple, centralized progress math.
* Hardcoded conversion rate serves as a placeholder for dynamic price-feeds (e.g. Chainlink Oracles) in version 3.

---

## ADR 3: Post-Transaction Blockchain Anchoring (Offline Ledger Proof)

### Context
Making transaction signature verifications wait for active blockchain mining synchronously blocks the HTTP thread. It can cause request timeouts if the Sepolia network is congested.

### Decision
Decouple transaction writing from proof confirmation:
1. Write the donation to the SQL database immediately after payment verification.
2. Trigger the Ethereum `anchorDonation()` transaction asynchronously in the background.
3. Catch anchoring transaction failures gracefully without rolling back the SQL donation record.

### Implications
* Provides immediate, responsive checkout feedback to the client.
* Preserves fundraiser progress even if Sepolia is temporarily congested or slow.
