---
title: SMART Disburse — overview
type: product-overview
status: draft
last_reviewed: 2026-11-02
product: smart-disburse
layout_family: Token flow
current_version: "R3"
---

# SMART Disburse

## Purpose
The payee's side of a payment sent from SMART Hub AP. The payee opens a secure link, proves who they are, reviews
the claim documents, and chooses how to receive the money: an instant virtual card, their debit card, their bank
account (ACH) or a check. No account or portal is needed.

## Primary users
- **The claimant / payee:** the person or business being paid, for example an insurance claimant.
- **In Multi-Party:** several **co-payees** who share one payment, one of them the **primary party**.
- TODO(confirm): whether suppliers (businesses) use the same flow, or only claimants (individuals).

## Flows
- [US Default](flows/us-default.md): one payee.
- [US Multi-Party](flows/multi-party.md): a shared payment with an allocation step.
- [UK claim demo](flows/uk-claim-demo.md): hidden; status TODO(confirm).

## Layout family
**Token flow**: dark navy step rail on the left, content on the right, blue amount card. See
[suite/layouts.md](../../suite/layouts.md#3-token-flow-disburse-collect).

## Interacts with
- **Hub (AP):** Hub chooses SMART Disburse as the payment method, moves the funds to a Balance Account, emails the link and shows
  "Pending Payee Action"; cancelling voids the token (I-04).

Full details: [suite/integrations.md](../../suite/integrations.md).

## Pages in this folder
- [standard.md](standard.md): steps, payment methods, business rules, states
- [flows/](flows/us-default.md): flow maps and screen-by-screen detail
- [changelog.md](changelog.md): history of standard versions
- [variants/](variants/README.md): client-specific deltas

## Code
- Entry and flow menu: `src/pages/smart-disburse/index.html`
- Screens: `src/pages/onboarding/*.html`; steps: `src/data/onboarding-steps.json`
- Logic:
  - `src/scripts/onboarding-flow.js` (flow choice, Multi-Party state)
  - `src/scripts/onboarding-multi-party.js`
  - `src/scripts/sd-onboarding-context.js` (Hub payable / payee context)
  - the other `src/scripts/onboarding-*.js` files, plus `confirm-identity.js`, `confirm-business-details.js`, `review-documents.js`,
    `paywall.js`, `virtual-card*.js`, `bank-*.js`, `debit-card.js`, `card-created.js`
- Content and rules: `src/data/sd-*.json`
- Token email (test): `src/pages/tools/sd-sx-token-test.html`, `workers/sd-sx-token-service/`, `docs/github-pages-sd-sx-token-testing.md`
- UK demo (hidden): `src/pages/sd-uk/`

## Figma
- [LAUNCHED] Default Flow ([Figma](https://www.figma.com/design/4WZgq8XswZFkHcI6bzOIiK)): the claimant flow's source of truth.
- Multi-Party: per code comments, Figma "⌛️ SD (Versioning)", page "Multi-Party 1.07". TODO: add its file key.
- Regional and rail flows: [figma-files.md](../../design-system/figma-files.md#disburse-regional-and-rail-flows).
