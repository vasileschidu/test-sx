---
title: Consumer Portal — current standard
type: standard
status: draft
last_reviewed: 2026-10-17
product: consumer-portal
version: TODO
---

# Consumer Portal — current standard (vTODO)

Describes the latest standard version on `main`. Client differences are **not** here; see [variants/](variants/README.md).

## Capabilities
TODO: what users can do, grouped by area.

## Screens / steps
TODO: main screens (portal) or steps (flow), each with one line on its purpose.

## Date columns

Pending: *Date Initiated (off by default)* · Paid: **Date Processed** · *Date Initiated (off by default)* · Exceptions: **Date Initiated**
(Every column is available in Manage columns on every tab; see [Manage columns](../../design-system/table-filter.md#manage-columns).) Rules: [table filter → Date columns per portal](../../design-system/table-filter.md#date-columns-per-portal).
Date Processed is the payment's "complete" activity event (`getDateProcessedIso`).

## Table filter

Uses the shared filter ([design-system/table-filter.md](../../design-system/table-filter.md), [decision 0002](../../decisions/0002-shared-table-filter.md)):
same layout and behavior as every portal. Categories come from this table’s column headers.
Current categories and gaps: [Consumer Portal: Payments Received](../../design-system/table-filter.md#consumer-portal-payments-received).

## Business rules
TODO: rules that are easy to get wrong (limits, approvals, validation, statuses).

## Statuses and lifecycle
TODO: e.g. payment / enrollment / token statuses and transitions.

## Known limitations
TODO
