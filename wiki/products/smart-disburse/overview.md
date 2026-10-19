---
title: SMART Disburse — overview
type: product-overview
status: draft
last_reviewed: 2026-10-17
product: smart-disburse
layout_family: Token flow
current_version: "R3"
---

# SMART Disburse

## Purpose
Token-based flow for **disbursing** payments. The recipient receives a payment without using a full portal.

## Primary users
TODO: payees receiving a token (suppliers and/or consumers?).

## Layout family
**Token flow**. See [suite/layouts.md](../../suite/layouts.md).

## Interacts with
- **Hub**: Hub AP issues the disbursement token (I-04)

Full details: [suite/integrations.md](../../suite/integrations.md).

## Pages in this folder
- [standard.md](standard.md): what the current standard version does
- [changelog.md](changelog.md): history of standard versions
- [variants/](variants/README.md): client-specific deltas

## Code
- Path in repo:
  - `src/pages/smart-disburse/index.html`
  - `src/pages/sd-uk/` (claim → verify → choose bank or card → review → sign → done). TODO(confirm): UK standard, or a client variant?
  - Token test tool: `src/pages/tools/sd-sx-token-test.html`, backend `workers/sd-sx-token-service`
- Figma: TODO
