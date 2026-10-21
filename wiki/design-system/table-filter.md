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
4. **Same list on every tab.** The filter shows every filterable column header of the portal on every tab, whether or not
   the current tab shows that column or has values in it. A filter on a column the tab has no values for returns no rows there
   (e.g. Payment Date on Hub's Ready to Pay). Applied filters stay applied, and visible as chips, on every tab.
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
| Tabs | Same categories on every tab. Applied filters persist across tabs and always apply |
| Empty result | Table empty state. TODO: one shared "no results" message |

## Date columns per portal

Defined by product/design on 2026-10-21. Each date has a fixed meaning, and that meaning decides which tabs show it.

| Date | Meaning | Portals | Shown on |
|---|---|---|---|
| **Due Date** | When the bill is due | SMART Hub AP only | Unpaid bills: Ready to Pay, Exceptions |
| **Date Initiated** | When the payment was started | All portals | Shown by default where a payment is in flight: In Progress / Processing (incl. Scheduled) and Exceptions. On **Pending** tabs and **Paid** it is **opt-in**: off by default, available in Manage columns |
| **Payment Date** (Hub AP) / **Date Processed** (Exchange, Consumer) | When the payment completed | All portals | Paid tab only |

Per tab (*opt-in* = off by default, the user can switch it on in Manage columns):

| Portal | Pending tab(s) | In Progress | Paid | Exceptions |
|---|---|---|---|---|
| Hub AP: Bills & Payables | Ready to Pay: Due Date · *Date Initiated (opt-in)* | Date Initiated | Payment Date · *Date Initiated (opt-in)* | Due Date, Date Initiated |
| SMART Exchange | Pending, Action Required: *Date Initiated (opt-in)* | (no such tab) | Date Processed · *Date Initiated (opt-in)* | Date Initiated |
| Consumer Portal | Pending: *Date Initiated (opt-in)* | (no such tab) | Date Processed · *Date Initiated (opt-in)* | Date Initiated |

**Manage columns:** the opt-in setting is shared by the Pending tabs and Paid. Switching Date Initiated on in Pending
also shows it on Paid, and vice versa. In Progress / Exceptions keep their own setting (on by default). Every other column
has one setting for all tabs.

TODO(confirm): the rule doesn't cover **Exceptions**. It keeps Date Initiated (and Due Date in Hub) because a failed
payment was initiated. TODO(confirm): Exchange and Consumer have no In Progress tab. Processing payments sit in **Pending**,
so Date Initiated is opt-in for them as well.

**Filter:** each date is its own category, on every tab: Hub has Due Date, Date Initiated and Payment Date;
Exchange and Consumer have Date Initiated and Date Processed. In Exchange and Consumer the two dates share one date panel
(with calendar), and each keeps its own range. Opening the other date in the filter switches the panel between them.

## Filter content per portal

Derived from each table's columns on `main` (2026-10-21). When columns change, update this table and the filter together.

### SMART Hub AP: Bills & Payables

Columns: Amount, Bill Reference, Payee, Payment Method, Source, Due Date, Date Initiated, Payment Date, Status, Failure Reason.

All categories show on every tab.

| Category (= header) | Type | Has values on | Today in code |
|---|---|---|---|
| Payee | Multi-select + search | all tabs | ✓ |
| Payment Method | Multi-select | In Progress, Paid, Exceptions | ✓ |
| Source | Multi-select | all tabs | ✓ |
| Status | Multi-select | all tabs | ✓ |
| Due Date | Date range | all tabs (column shown on Ready to Pay, Exceptions) | ✓ (no calendar yet) |
| Date Initiated | Date range | In Progress, Paid, Exceptions | ✓ (no calendar yet) |
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
| Date Initiated | Date range | ✓ |
| Date Processed | Date range (values on Paid only) | ✓ |
| Failure Reason | Multi-select (Exceptions tab) | ✓ |

### Consumer Portal: Payments Received

Columns: Amount, Payer, Invoice #, Date Initiated / Date Processed (per tab), Payment Method, Payment Reference (Paid, Exceptions), Status, Failure Reason.

| Category (= header) | Type | Today in code |
|---|---|---|
| Payer | Multi-select + search | ✓ label; ✗ no search |
| Payment Method | Multi-select | ✓ |
| Status | Multi-select | ✓ |
| Date Initiated | Date range | ✓ |
| Date Processed | Date range (values on Paid only) | ✓ |
| Failure Reason | Multi-select (Exceptions tab) | ✓ |

## Current implementations (to be replaced)

| Table | Filter code | Missing vs shared spec |
|---|---|---|
| Hub Bills & Payables | `src/scripts/bills-payables-table.js` | calendar picker |
| Hub Vendors | `src/scripts/vendors-page.js` | out of scope for now |
| Exchange Payments | `src/scripts/exchanges-table.js` | nothing for content; still its own code |
| Consumer Payments Received | `src/scripts/consumer-exchanges-table.js` | Select all; category search; does not use `TableUi` |

Labels, Reset, one category list for all tabs, separate date categories and Vendor Entry were aligned in all three tables on 2026-10-21 (option A).
The single shared component (option B) is still to do: until then, the same rule is implemented three times.

Shared helpers that exist today: `TableUi.filterChip` and `TableUi.filterCheckbox` in `src/scripts/table-ui.js`.
