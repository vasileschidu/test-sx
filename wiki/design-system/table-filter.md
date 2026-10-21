---
title: Table filter
type: guide
status: draft
last_reviewed: 2026-10-21
source: decision 0002 (2026-10-21); follow-up decisions 2026-10-21 (Reset wording, Vendors out of scope, Vendor Entry filterable); filter alignment on branch filter-alignment (2026-10-21)
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
   When a tab shows a different date column (e.g. Payment Date on Hub's Paid tab), the filter uses that column's name.
4. **Columns the tab has.** A category appears only when the current tab has its column, whether or not
   the user has switched that column on in **Manage columns**. Example: Hub’s Ready to Pay tab has no Date Initiated
   column, so there is no Date Initiated filter there. Failure Reason is off by default in Manage columns but still filterable on Exceptions.
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
| Tabs | Filters persist across tabs, but a category the new tab doesn’t have is ignored (not applied, counted or shown as a chip) |
| Empty result | Table empty state. TODO: one shared "no results" message |

## Date columns per portal

Defined by product/design on 2026-10-21. Each date has a fixed meaning, and that meaning decides which tabs show it.

| Date | Meaning | Portals | Shown on |
|---|---|---|---|
| **Due Date** | When the bill is due | SMART Hub AP only | Unpaid bills: Ready to Pay, Exceptions |
| **Date Initiated** | When the payment was started | All portals | Payments in flight: In Progress / Processing, including Scheduled. **Not** on Pending tabs, **not** on Paid |
| **Payment Date** (Hub AP) / **Date Processed** (Exchange, Consumer) | When the payment completed | All portals | Paid tab only |

Per tab:

| Portal | Pending tab(s) | In Progress | Paid | Exceptions |
|---|---|---|---|---|
| Hub AP: Bills & Payables | Ready to Pay: Due Date | Date Initiated | Payment Date | Due Date, Date Initiated |
| SMART Exchange | Pending, Action Required: no date | (no such tab) | Date Processed | Date Initiated |
| Consumer Portal | Pending: no date | (no such tab) | Date Processed | Date Initiated |

TODO(confirm): the rule doesn't cover **Exceptions**. It keeps Date Initiated (and Due Date in Hub) because a failed
payment was initiated. TODO(confirm): Exchange and Consumer have no In Progress tab. Processing payments sit in **Pending**,
so they show no date there.

**Filter:** the "initiated / processed" date is one filter category, and its label follows the tab's column
(Date Initiated, Payment Date or Date Processed). A range applies only to the date column it was set on, so a range set on
Paid doesn't carry over to Exceptions.

## Filter content per portal

Derived from each table's columns on `main` (2026-10-21). When columns change, update this table and the filter together.

### SMART Hub AP: Bills & Payables

Columns: Amount, Bill Reference, Payee, Payment Method, Source, Due Date, Date Initiated, Payment Date, Status, Failure Reason.

| Category (= header) | Type | Tabs where shown | Today in code |
|---|---|---|---|
| Payee | Multi-select + search | all | ✓ |
| Payment Method | Multi-select | In Progress, Paid, Exceptions | ✓ |
| Source | Multi-select | all | ✓ |
| Status | Multi-select | all | ✓ |
| Due Date | Date range | Ready to Pay, Exceptions | ✓ (no calendar yet) |
| Date Initiated | Date range | In Progress, Exceptions | ✓ (no calendar yet) |
| Payment Date | Date range | Paid | ✓ (no calendar yet) |
| Failure Reason | Multi-select | Exceptions | ✓ |

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

Columns: Amount, Vendor Entry, Invoice #, Customer, Date Initiated / Date Processed (per tab), Payment Method, Status, Failure Reason.

| Category (= header) | Type | Today in code |
|---|---|---|
| Vendor Entry | Multi-select + search | ✓ |
| Customer | Multi-select + search | ✓ |
| Payment Method | Multi-select | ✓ |
| Status | Multi-select | ✓ |
| Date Initiated | Date range (Exceptions tab) | ✓ |
| Date Processed | Date range (Paid tab) | ✓ |
| Failure Reason | Multi-select (Exceptions tab) | ✓ |

### Consumer Portal: Payments Received

Columns: Amount, Payer, Invoice #, Date Initiated / Date Processed (per tab), Payment Method, Payment Reference (Paid, Exceptions), Status, Failure Reason.

| Category (= header) | Type | Today in code |
|---|---|---|
| Payer | Multi-select + search | ✓ label; ✗ no search |
| Payment Method | Multi-select | ✓ |
| Status | Multi-select | ✓ |
| Date Initiated | Date range (Exceptions tab) | ✓ |
| Date Processed | Date range (Paid tab) | ✓ |
| Failure Reason | Multi-select (Exceptions tab) | ✓ |

## Current implementations (to be replaced)

| Table | Filter code | Missing vs shared spec |
|---|---|---|
| Hub Bills & Payables | `src/scripts/bills-payables-table.js` | calendar picker |
| Hub Vendors | `src/scripts/vendors-page.js` | out of scope for now |
| Exchange Payments | `src/scripts/exchanges-table.js` | nothing for content; still its own code |
| Consumer Payments Received | `src/scripts/consumer-exchanges-table.js` | Select all; category search; does not use `TableUi` |

Labels, Reset, tab-aware categories and Vendor Entry were aligned in all three tables on 2026-10-21 (option A).
The single shared component (option B) is still to do: until then, the same rule is implemented three times.

Shared helpers that exist today: `TableUi.filterChip` and `TableUi.filterCheckbox` in `src/scripts/table-ui.js`.
