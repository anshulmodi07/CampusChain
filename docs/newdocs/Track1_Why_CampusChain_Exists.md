# Track 1 — Why CampusChain Exists (Product / Market / USP)

This is the "tell me about this project" opener. Goal: sound like you built this to solve
a real trust problem, not because blockchain is trendy. Every claim below is checked
against your actual architecture doc — including the places where the claim is *slightly
weaker* than the marketing pitch, so you don't get caught overclaiming under a follow-up.

---

## 1. The Problem (one paragraph, say this first)

When someone donates to a small fundraiser — a medical emergency, a campus cause, a
grassroots NGO drive — they have no way to independently verify the money was received
or used as claimed. They're trusting a platform's database, which is a black box: the
platform *could* show any number it wants, and there's no way for an outsider to check.
Established platforms like Ketto or Milaap ask you to trust *them*; CampusChain tries to
remove that trust requirement by anchoring proof of each donation somewhere no single
party — including CampusChain itself — can quietly alter.

**Say this, not "we used blockchain because it's cool."** The blockchain is the
mechanism, not the pitch. The pitch is: *donors shouldn't have to trust us.*

---

## 2. Who It's For

- Small-to-mid NGOs and individual campaign organizers — not large charities that already
have institutional trust, audited financials, and brand recognition.
- Donors who are skeptical of where their money actually goes, especially for
one-off/emergency causes with no track record.
- A campus/college-adjacent context specifically (per your resume title) — smaller,
higher-trust-needed fundraisers where a large audited-NGO overhead doesn't make sense.

---

## 3. The USP — One Sentence

> "Every donation — whether paid in ETH or in INR via Razorpay — gets a cryptographic
> hash anchored on a public blockchain via the `DonationProofRegistry` contract, so
> anyone can independently verify on Etherscan that a donation was recorded and has not
> been silently altered, without having to trust CampusChain's own database."

This is accurate to your actual implementation: **both** payment rails funnel into the
same proof registry (Section 3C of your architecture doc — "Isolating the proof logging
logic in `DonationProofRegistry` allows both on-chain and off-chain donations to register
a cryptographic audit trail using the same schema"). That's a genuinely good unification
story — INR and ETH donors get the *same* integrity guarantee, which is not obvious and
worth stating explicitly if asked "how do the two payment rails relate."

---

## 4. Why Not Just... (comparison table)

| Alternative | Why it falls short |
|---|---|
| **Spreadsheet + periodic third-party audit** | Audits are after-the-fact and sampled. Between audits, records can be silently edited with no trace. An on-chain hash is created *at the moment of donation* and is checkable by anyone, forever, with zero ongoing trust in an auditor. |
| **Existing platforms (Ketto/Milaap)** | Same trust model as spreadsheets — you trust the platform's database. They have brand trust; CampusChain substitutes technical trust for brand trust, which is a fair tradeoff for a platform with no track record yet. |
| **Just publish a public ledger/Google Sheet** | Still mutable by whoever holds edit access, with no cryptographic guarantee and no independent verification path. |

---

## 5. The Honest Caveat — Read This Before the Interview

**This is the part that matters most.** Your architecture doc surfaces a real gap in the
trust story, and if you don't know it going in, a sharp interviewer will find it and it
will look like you don't understand your own system:

> **Backend Omission Vulnerability** (Security §B): the blockchain anchoring call runs
> inside a `try...catch`. If the RPC write fails, the DB record is kept but
> `anchor_tx_hash` stays `NULL`. A compromised or malicious backend could skip anchoring
> entirely while still returning a success response to the user — meaning the "provably
> anchored" guarantee is not currently self-enforcing; it depends on the backend acting
> honestly, at least for that anchoring step.

**Don't hide this. Use it as a strength.** If asked "so is this actually trustless?" —
the honest, strong answer is:

> "Not fully, yet — and that's an important distinction I'd flag myself. What's fully
> trustless is *verification*: once a hash is anchored, anyone can check it independently
> without trusting us. What's *not* yet fully trustless is *anchoring itself* — a
> malicious backend could currently skip writing the proof while still telling the user
> it succeeded. The fix is to move anchoring off the request path into an auditable,
> monitored queue (which is actually part of the scalability redesign I already planned —
> see Section 6C), and add alerting on any donation whose `anchor_tx_hash` stays NULL
> past a timeout."

This shows self-awareness instead of a sales pitch — which is a stronger interview signal
than pretending the system is airtight.

**Second gap, same theme** (Gaps §1): the backend currently trusts the client-submitted
`tx_hash` for MetaMask donations without re-verifying the transaction's actual `to`/`value`
via an RPC read. Someone could theoretically submit an unrelated Sepolia tx hash to fake
a donation credit in the SQL database (note: this wouldn't get them a fake *anchored
proof*, since the anchor hash is derived from DB fields the attacker doesn't fully
control — but it would pollute the donor-facing display numbers). If asked "how would
you harden this," the answer is: verify the submitted `tx_hash` on-chain (check `to`
address matches the contract, `value` matches claimed amount) before writing the DB row.

---

## 6. If Asked: "What's the biggest weakness in your trust model right now?"

Lead with the backend omission vulnerability above. It's specific, it's real, and it
shows you understand the difference between "we used a blockchain" and "we built a
trustless system" — most interviewees conflate the two, so naming the gap precisely is a
differentiator, not a liability.

---

## 7. Quick Reference — The 30-Second Version

"CampusChain solves a trust problem: small fundraisers and NGOs ask people to donate
based on faith in a platform's database, with no way to check. I built a system where
every donation — crypto or INR via Razorpay — gets a cryptographic hash anchored on
Ethereum through a dedicated proof registry contract, so anyone can independently verify
on Etherscan that a donation was recorded and hasn't been altered. It's not perfectly
trustless yet — the anchoring step itself currently depends on the backend behaving
honestly — but the verification side is fully independent, and hardening the anchoring
path is a concrete next step I've already scoped."

---

*Next: Track 2 — Full architecture walkthrough (what goes where, why), built from the
same source doc.*
