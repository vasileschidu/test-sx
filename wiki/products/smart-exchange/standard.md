---
title: SMART Exchange — current standard
type: standard
status: draft
last_reviewed: 2026-10-17
product: smart-exchange
version: "R3"
source: STP section drafted from code (stp-state.js, payment-preferences-page.js, topbar-component.js) and the Figma "[WIP] SH Sandbox" Payment Methods frames on 2026-10-19; open questions reviewed with design on 2026-10-20
---

# SMART Exchange — current standard (R3)

Describes the latest standard version on `main`. Client differences are **not** here; see [variants/](variants/README.md).

## Capabilities
TODO: what users can do, grouped by area.

## Screens / steps
TODO: main screens (portal) or steps (flow), each with one line on its purpose.

## Automatic Card Processing (STP)

Lets a supplier with its own card processor have eligible card payments processed automatically to its merchant
account, instead of keying each card in by hand from **Get paid**. It appears in the SMART Exchange token flow (Card
option, per the product owner; not built yet) and in the SX portal: the Automatic Card Processing card in **Payment
Preferences → Payment Methods → Payers' Cards** and a banner in the top bar. Consumer Portal never shows it
(`hideStp`).

Opt-in flow, states, business rules, prototype notes and open questions: **[STP](stp.md)**.

## Date columns

Pending, Action Required: *Date Initiated (off by default)* · Paid: **Date Processed** · *Date Initiated (off by default)* · Exceptions: **Date Initiated**
(Every column is available in Manage columns on every tab; see [Manage columns](../../design-system/table-filter.md#manage-columns).) Rules: [table filter → Date columns per portal](../../design-system/table-filter.md#date-columns-per-portal).
Date Processed is the payment's "complete" activity event (`getDateProcessedIso`).

## Table filter

Uses the shared filter ([design-system/table-filter.md](../../design-system/table-filter.md), [decision 0002](../../decisions/0002-shared-table-filter.md)):
same layout and behavior as every portal. Categories come from this table’s column headers.
Current categories and gaps: [SMART Exchange: Payments](../../design-system/table-filter.md#smart-exchange-payments-supplier-portal).

## Business rules
TODO: rules that are easy to get wrong (limits, approvals, validation, statuses).

- Automatic Card Processing (STP): [stp.md → Business rules](stp.md#business-rules).

## Statuses and lifecycle
TODO: e.g. payment / enrollment / token statuses and transitions.

## Known limitations
TODO
