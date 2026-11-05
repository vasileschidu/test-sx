---
title: SMART Exchange — overview
type: product-overview
status: draft
last_reviewed: 2026-10-17
product: smart-exchange
layout_family: Portal
current_version: "R3"
---

# SMART Exchange

## Purpose
Where **suppliers** (businesses) receive payments. SMART Exchange is **both**:

- a **portal** ("Supplier Portal" in the code): Payments, Payment Preferences, My Company Profile;
- a **token flow**: an emailed link to receive one payment, next to the portal, the way SMART Disburse is the token flow
  for claimants. TODO(confirm): the prototype has no SX-specific token-flow screens yet. Hub's SX test email opens the shared
  token-flow shell, which shows the SMART Disburse screens ([layouts](../../suite/layouts.md#3-token-flow-disburse-collect)).

**[STP](stp.md)** (Automatic Card Processing) is a feature of both: suppliers with their own card processor opt in so
card payments go to their merchant account automatically. Built in the portal only so far.

## Primary users
Suppliers.

## Layout family
**Portal**. See [suite/layouts.md](../../suite/layouts.md).

## Interacts with
- **Hub**: receives AP payments created in Hub (I-02)
- **Token service**: emails the STP agreement to the signer, linking back to Payment Preferences (I-06)

Full details: [suite/integrations.md](../../suite/integrations.md).

## Pages in this folder
- [standard.md](standard.md): what the current standard version does
- [stp.md](stp.md): STP (Automatic Card Processing): opt-in flow, states, rules
- [changelog.md](changelog.md): history of standard versions
- [variants/](variants/README.md): client-specific deltas

## Code
- Path in repo:
  - `src/pages/dashboard/supplier-portal.html`, `payment-preferences.html`, `my-company-profile.html`
  - Called **"Supplier Portal"** in the code and nav. TODO(confirm): same product as SMART Exchange?
  - Possibly also `src/pages/onboarding/` (see Enroll)
  - STP: `src/scripts/stp-state.js`, `src/scripts/pages/payment-preferences-page.js`, `src/scripts/topbar-component.js`
- Figma: [R3] SMART Exchange [Figma](https://www.figma.com/design/9DRzbyv7FDCDYFYN5ZGuwZ)
- Module-level source-of-truth files: [design-system/figma-files.md](../../design-system/figma-files.md)
