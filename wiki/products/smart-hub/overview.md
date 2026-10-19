---
title: SMART Hub — overview
type: product-overview
status: draft
last_reviewed: 2026-10-17
product: smart-hub
layout_family: Portal
current_version: "R1.0"
---

# SMART Hub

## Purpose
Central product of the suite. Manages **Payables (AP)**, paying suppliers and consumers, and **Receivables (AR)**, collecting payments owed to the organization.

## Primary users
TODO: e.g. finance / AP-AR teams at the organization.

## Layout family
**Portal**. See [suite/layouts.md](../../suite/layouts.md).

## Interacts with
- **Enroll**: users get access to Hub through Enroll (I-01)
- **Exchange**: AP payments to suppliers (I-02)
- **Consumer Portal**: AP payments to consumers (I-03)
- **Disburse**: AP payouts via token (I-04)
- **Collect**: AR collections via token (I-05)

Full details: [suite/integrations.md](../../suite/integrations.md).

## Pages in this folder
- [standard.md](standard.md): what the current standard version does
- [changelog.md](changelog.md): history of standard versions
- [variants/](variants/README.md): client-specific deltas

## Code
- Path in repo:
  - `src/pages/dashboard/bills-and-payables.html`, `payables-pay.html`, `vendors.html`, `vendor-profile.html`, `ap-ar-payments.html`
  - Scripts: `src/scripts/bills-payables-table.js`, `src/scripts/payables-pay.js`
  - Data: `src/data/bills-payables.json`, `src/data/payees.json`
  - Shared Portal shell: see [suite/layouts.md](../../suite/layouts.md)
- Figma: TODO
