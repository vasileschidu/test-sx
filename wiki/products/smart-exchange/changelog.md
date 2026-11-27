---
title: SMART Exchange — changelog
type: changelog
status: draft
last_reviewed: 2026-10-17
product: smart-exchange
---

# SMART Exchange — changelog

Standard versions only, newest first. Entry format: [templates/changelog-entry.md](../../templates/changelog-entry.md).

## Unreleased — 2026-11-27

TODO(confirm): which release this belongs to.

- Added: Preboarding, token flow, new user (TCDM-5263): invite with no payment → confirm identity and
  business, choose a preferred payment method, create an account. See [preboarding.md](preboarding.md).
- Changed: Payment Preferences keeps the Global Preferences default order after Save (`pp_default_methods_v1`)
  and shows the method saved by Preboarding.
- Cross-product impact: none.

## Unreleased — 2026-10-19

TODO(confirm): which release this belongs to.

- Added: Visa agreement signature step in Automatic Card Processing (STP), with the agreement email
  sent through `workers/sd-sx-token-service`. See [standard.md](standard.md#automatic-card-processing-stp).
- Changed: STP top bar banner and Payment Preferences card match the Figma Payment Methods designs.
- Added: Payment Preferences shows a "Remove Custom Payment Preference" confirmation before a payer's
  custom preference is removed, and "Why set multiple payment methods?" opens the "Ensure You Get
  Paid" dialog.
- Changed: Customize Default Preferences by Payer has the "Entity on File with Payer" column, filled
  from the payer's ERP entries.
- Changed: Supplier Portal Payment Method column shows "ACH" as plain text without the account
  digits, and "SMART Exchange" instead of a dash before a method is chosen.
- Removed: the "Fully Automated" toggle and its guide from the enabled STP card (not in the design).
- Fixed: Payment Preferences on the supplier page failed to load because the shared script used
  Consumer Portal-only fields.
- Cross-product impact: none.

TODO: add earlier version history.
