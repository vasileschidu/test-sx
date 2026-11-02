---
title: SMART Disburse — changelog
type: changelog
status: draft
last_reviewed: 2026-11-02
product: smart-disburse
---

# SMART Disburse — changelog

Standard versions only, newest first. Entry format: [templates/changelog-entry.md](../../templates/changelog-entry.md).

## R3 — baseline documented 2026-11-02

First write-up of the standard as built in the prototype (`main` @ c4ff8d3). Not a release note: it records what R3
contains today.

- US Default flow: verification code → identity questions → review documents → choose method → summary with
  consents and signature → confirmation with receipt.
- Payment methods: Instant Virtual Card, Debit Card, Bank Account (ACH, with verification on deposit), Check.
- US Multi-Party: Current Allocation step (accept / change / dispute), allocation log, Payment Status while other
  parties finish, Payment Closed (expired / revoked / disputed, with fallback to the primary party).
- Decline and Revoked end states.
- Cross-product impact: I-04 (Hub AP → Disburse). See [integrations](../../suite/integrations.md).

TODO: earlier history (R1, R2) is not recorded.
