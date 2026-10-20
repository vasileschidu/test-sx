---
title: SMART Exchange — changelog
type: changelog
status: draft
last_reviewed: 2026-10-17
product: smart-exchange
---

# SMART Exchange — changelog

Standard versions only, newest first. Entry format: [templates/changelog-entry.md](../../templates/changelog-entry.md).

## Unreleased — 2026-10-19

TODO(confirm): which release this belongs to.

- Added: Visa agreement signature step in Automatic Card Processing (STP), with the agreement email
  sent through `workers/sd-sx-token-service`. See [standard.md](standard.md#automatic-card-processing-stp).
- Changed: STP top bar banner and Payment Preferences card match the Figma Payment Methods designs
  (on `vlad-sandbox`, not yet on `main`).
- Removed: the "Fully Automated" toggle and its guide from the enabled STP card (not in the design).
- Fixed: Payment Preferences on the supplier page failed to load because the shared script used
  Consumer Portal-only fields.
- Cross-product impact: none.

TODO: add earlier version history.
