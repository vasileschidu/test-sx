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
Supplier portal where **suppliers** (businesses) receive payments.

## Primary users
Suppliers.

## Layout family
**Portal**. See [suite/layouts.md](../../suite/layouts.md).

## Interacts with
- **Hub**: receives AP payments created in Hub (I-02)

Full details: [suite/integrations.md](../../suite/integrations.md).

## Pages in this folder
- [standard.md](standard.md): what the current standard version does
- [changelog.md](changelog.md): history of standard versions
- [variants/](variants/README.md): client-specific deltas

## Code
- Path in repo:
  - `src/pages/dashboard/supplier-portal.html`, `payment-preferences.html`, `my-company-profile.html`
  - Called **"Supplier Portal"** in the code and nav. TODO(confirm): same product as SMART Exchange?
  - Possibly also `src/pages/onboarding/` (see Enroll)
- Figma: [R3] SMART Exchange [Figma](https://www.figma.com/design/9DRzbyv7FDCDYFYN5ZGuwZ)
- Module-level source-of-truth files: [design-system/figma-files.md](../../design-system/figma-files.md)
