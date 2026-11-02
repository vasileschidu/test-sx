---
title: SMART Disburse — UK claim demo
type: guide
status: draft
last_reviewed: 2026-11-02
product: smart-disburse
---

# SMART Disburse — UK claim demo

> TODO(confirm): is this a **standard regional flow** or a **client variant**? Until someone decides, treat it as neither.
> It's hidden from the entry page and the SMART Disburse menu, but the pages are kept in the repo.

A separate claim flow for the UK, on the same onboarding shell (sidebar stepper, mobile header).

- **Code:**
  - Pages: `src/pages/sd-uk/`
  - Shared script: `src/scripts/sd-uk-flow.js`
  - Claim data: `src/data/sd-uk-claim.js`
  - Styles: `src/styles/sd-uk.css`
- **Steps** (`window.OB_FLOW_STEPS` in `src/data/sd-uk-claim.js`): Verification (`verify`) → Confirm Identity (`claim`) →
  Review Documents (`review`) → **Provide Signature** (`sign`, a step of its own here) → Receive Payment (`payment`) → Complete.
- **Receive Payment:** either **bank** (`bank` → `bank-billing` → `bank-summary` → `bank-done`) or **card** (`card` →
  `card-summary` → `card-done`). `index` is the welcome screen, `contact` is a contact page every step links to, and `thank-you`
  ends the flow.
- **Differences from the US flow:** a separate signature step before payment, and only bank or card (no debit card, no
  check). TODO(confirm) against Figma.
- **Figma:** 🇬🇧 UK Expansion (`HHw1hEtPqLR8ashOaxBts5`), mostly on a Draft page. The Figma audit notes it uses US wording
  ("Checking / Savings", "Routing Number") where UK bank fields (Sort Code) apply. See
  [figma-files.md](../../../design-system/figma-files.md#disburse-regional-and-rail-flows).

Not documented further until its status is decided.
