---
title: 0002 — One table filter for all portals, content per portal
type: decision
status: draft
last_reviewed: 2026-10-21
decision_status: accepted
date: 2026-10-21
products: [smart-hub, smart-exchange, consumer-portal]
superseded_by:
---

# 0002 — One table filter for all portals, content per portal

## Context
Each portal's table has its own filter implementation (`bills-payables-table.js`, `exchanges-table.js`,
`consumer-exchanges-table.js`, `vendors-page.js`). They have drifted apart in layout, behavior and wording:
- some have a calendar date picker and some don't
- some say "Reset" and others "Clear"
- some use "By status"-style labels and others plain nouns

Worse, filter names often don't match the table's column headers (filter "Payment Type" vs column
"Payment Method", "Payment Date" vs "Date Initiated"). One Hub filter even targets a column that its tab
hides. Details: [portal consistency audit](../design-system/portal-consistency.md).

## Decision
1. **Layout and functionality are the same in every portal.** One shared filter component, specified in
   [design-system/table-filter.md](../design-system/table-filter.md). No portal-specific variations of the panel,
   controls, behavior or wording.
2. **Content is specific to each portal.** The filter categories are driven by the data points the
   table actually shows: its **column headers**. The four portals are SMART Hub AP, SMART Hub AR,
   SMART Exchange and Consumer Portal.
3. A filter category's **label is exactly the column header**. If a header changes, the filter label changes too.
4. A category is offered only if the current tab **has** its column, whether or not the user switched it on in Manage columns.

## Consequences
- Agents building or changing a table: define the columns first, then derive the filter categories from them using the
  per-portal tables in [table-filter.md](../design-system/table-filter.md#filter-content-per-portal).
  Never add a filter for a data point that has no column.
- The four current implementations must be replaced by the shared component (tracked in the audit).
- Client variants may add or remove **columns**, and the filter follows automatically. A variant must not
  change the filter's layout or behavior.
