---
title: Table filter
type: guide
status: draft
last_reviewed: 2026-10-21
source: decision 0002 (2026-10-21); follow-up decisions 2026-10-21 (Reset wording, Vendors out of scope, Vendor Entry filterable); current behavior read from code on main
---

# Table filter

The filter on every portal data table. Decided in [0002](../decisions/0002-shared-table-filter.md):

- **Layout and functionality: identical in all portals.**
- **Content: specific to each portal**, driven by that table's column headers.

## Rules

1. **One component.** Every portal table uses the same filter component. Do not build a filter inside a page script.
2. **Categories come from columns.** Each filterable column becomes one category. No column means no filter.
   Free-text identifiers (amounts, reference numbers) are found through **Search**, not the filter.
3. **Label = column header, exactly.** Same words, same capitalization, no prefix ("By …") and no plural.
   If a tab renames a column (e.g. Hub's Paid tab shows "Payment Date"), the filter uses that tab's name.
4. **Visible columns only.** A category appears only when its column is visible in the current tab
   (including after the user changes **Manage columns**).
5. **Category type follows the data:**

   | Column data | Category type |
   |---|---|
   | Fixed set of values (status, method, source) | Multi-select list |
   | Many values (payee, customer, payer) | Multi-select list **with search** |
   | Date | Date range (from / to) with calendar |

## Layout and functionality (shared)

What the one component does in every portal. It combines the most complete behavior found across the
current implementations. TODO(confirm): check against the Figma table filter in SMART System before building.

| Part | Behavior |
|---|---|
| Trigger | "Filter" button in the table toolbar, with a count of active filters |
| Panel | Two panes: categories on the left, each with a count badge; options on the right. On mobile: one pane at a time with a back step |
| Multi-select | Checkbox list with **Select all** |
| Search in category | For long lists (payee, customer, payer) |
| Date range | From / To fields (MM / DD / YYYY) **with a calendar picker** |
| Footer | **Reset** + **Apply**. Filters apply only on Apply. Reset clears the selections in the panel ("Clear" is not used) |
| Active filters | Shown as removable chips under the toolbar; removing a chip applies immediately |
| Tabs | Filters persist across tabs, but a category whose column the new tab hides is ignored (not shown as a chip) |
| Empty result | Table empty state. TODO: one shared "no results" message |

## Filter content per portal

Derived from each table's columns on `main` (2026-10-21). When columns change, update this table and the filter together.

### SMART Hub AP: Bills & Payables

Columns: Amount, Bill Reference, Payee, Payment Method, Source, Due Date, Date Initiated, Status, Failure Reason.

| Category (= header) | Type | Tabs where shown | Today in code |
|---|---|---|---|
| Payee | Multi-select + search | all | ✓ |
| Payment Method | Multi-select | In Progress, Paid, Exceptions | ✗ labelled "Payment Type"; also shown on Ready to Pay, where the column is hidden |
| Source | Multi-select | all | ✓ |
| Status | Multi-select | all | ✓ |
| Due Date | Date range | Ready to Pay, Exceptions | ✗ missing |
| Date Initiated (Paid tab: **Payment Date**) | Date range | In Progress, Paid, Exceptions | ✗ always labelled "Payment Date"; shown on Ready to Pay, where it empties the table |
| Failure Reason | Multi-select | Exceptions | ✗ labelled "Failure Reasons" |

Searchable, not filterable: Amount, Bill Reference.

### SMART Hub AP: Vendors

Columns: Vendor Name, Vendor ID, Status, Outstanding Amount, Total Paid.

**Out of scope for now** (decided 2026-10-21). Do not change the Vendors filter until this is picked up again.
Known gap for later: it filters on Source, Verification, Payment method and Last payment date, none of which is a column,
and it uses "By …" labels.

### SMART Hub AR

No AR table is built yet (Invoices/Receivables and Customers are placeholders). When it is built, derive
the categories from its columns using the rules above. TODO: add the table here at that point.

### SMART Exchange: Payments (Supplier Portal)

Columns: Amount, Vendor Entry, Invoice #, Customer, Date Initiated, Payment Method, Status, Failure Reason.

| Category (= header) | Type | Today in code |
|---|---|---|
| Vendor Entry | Multi-select + search | ✗ missing |
| Customer | Multi-select + search | ✓ |
| Payment Method | Multi-select | ✗ labelled "Payment Type" |
| Status | Multi-select | ✓ |
| Date Initiated | Date range | ✗ labelled "Payment Date" |
| Failure Reason | Multi-select (Exceptions tab) | ✗ labelled "Failure Reasons" |

### Consumer Portal: Payments Received

Columns: Amount, Payer, Invoice #, Date Initiated, Payment Method, Status, Failure Reason.

| Category (= header) | Type | Today in code |
|---|---|---|
| Payer | Multi-select + search | ✗ labelled "By customer", no search |
| Payment Method | Multi-select | ✗ labelled "By method of payment" |
| Status | Multi-select | ✗ labelled "By status" |
| Date Initiated | Date range | ✗ labelled "By initiated date" |
| Failure Reason | Multi-select (Exceptions tab) | ✗ labelled "Failure reason" (lowercase r) |

## Current implementations (to be replaced)

| Table | Filter code | Missing vs shared spec |
|---|---|---|
| Hub Bills & Payables | `src/scripts/bills-payables-table.js` | calendar picker; tab-aware categories |
| Hub Vendors | `src/scripts/vendors-page.js` | out of scope for now |
| Exchange Payments | `src/scripts/exchanges-table.js` | labels; Vendor Entry category |
| Consumer Payments Received | `src/scripts/consumer-exchanges-table.js` | Select all; category search; labels; "Clear" → "Reset"; does not use `TableUi` |

Shared helpers that exist today: `TableUi.filterChip` and `TableUi.filterCheckbox` in `src/scripts/table-ui.js`.
