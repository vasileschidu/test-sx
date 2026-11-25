# Bills/Payables + Pay page: Figma functional spec vs prototype (2026-11-13)

Read-only audit. Figma files: R2 = `DyBC356t1jIcoPrKjf9Ra8`, R1 = `XqVQvzcU3G9MipfyKpsjpR`, Review (Dual Approval) = `8c9VrlB1Sw7Ul8IrdELYFB`.
Code: `src/scripts/bills-payables-table.js`, `src/scripts/payables-pay.js`, `src/pages/dashboard/bills-and-payables.html`, `payables-pay.html`.
Method: text dump of every frame (use_figma, read-only) + 3 screenshots (R1 `9015:495015`, `9927:516877`, `9033:489512`). Many R1/R2 frames are old (invoice-number column, no Payment Type); R2 is the newer source.
Legend: done / partial / missing / differs. Code claims come from grep, not from running the page.

## 1. Bills/Payables list (tabs, columns, table)

| Feature / rule | Figma (file + node) | Code | Note |
|---|---|---|---|
| Tabs Ready to Pay / In Progress / Paid / Exceptions with counts (22 / 12 / 156 / 3) | R2 `5:12950`, `5:48198`, `8:30965`, `8:78750` | done | `TAB_LABELS`, `data-tab-count`; mobile select |
| Tab "File Manager" (batch upload only, visible only with Batch Upload data preference) | R2 `1:23092` + `1532:101325` | missing | Not in code. Includes Import Data, Download CSV Template (SMART Disburse Direct / SMART Collect Direct / Bill / Invoice templates), upload .csv up to 10MB, name-validation error, format error, loading state, file table (File name, # records, upload date, imported date, status Errors Found / Ready to Process / Processed), Process / Cancel / Refresh, expanded error text (see section 6) |
| Tab "Pending Approval" (dual approval) between Ready to Pay and In Progress | Review `1:115424`, `1:109220`, `1:12637` | missing | Wiki lists it as a known gap. See section 5 |
| Empty state "Connect Your Data" when no data source (button Get Started, "go to SMART Enroll") | R2 `1532:97953` | missing | Code only has the "No payables found" empty row |
| Empty state "No payables found / Looks like you don't have any outstanding payments in here." | R1 `165:99264` | differs | Code `4177`: title same, description is "Try a different search or adjust the active filters..." (acceptable) |
| Payments Overview heading with count; Refresh button (spins, skeleton) | R2 `5:12950` | done | `bp-refresh-btn`, 1s skeleton |
| Ready to Pay columns: amount+currency, bill reference, payee, source, due date, status (Unprocessed), Pay | R2 `5:12950` | done | Plus Payment Method etc. via Manage columns |
| In Progress / Paid / Exceptions add a "payment type" column (ACH, Cross-border, Card, Wire, SMART Disburse, SMART Collect, User Payment, Check, RTP, Multi-Party) | R2 `5:48198`, `8:30965`, `8:78750` | partial | Code has paymentMethodType but no Cross-border / SMART Collect / User Payment / RTP / Check / Multi-Party values (grep: no `cross_border`) |
| Paid tab adds "payment date" column | R2 `8:30965` | done | `processedDate` / `paymentDate` |
| Source column + Source filter on Ready to Pay (all source types except API Connection) | R2 `5:12950` note `5:12978` | partial | Code offers Source on all tabs; the "no API Connection on Ready to Pay" rule is data, not enforced |
| Row hover state; expand chevron per row | R2 `1559:27884` | done | expand + hover |
| Past Due status (In Progress) and amber overdue date | R2 `5:48198` (Past Due badge) | partial | Overdue date amber + "N days overdue" tooltip done (SH Sandbox `4157:108789`); "Past Due" as a status badge in In Progress not seen |
| Pagination "Rows per Page" + "Showing 1-10 of N results" | R2 all tabs | done | 10/25/50/100 |
| Multi-row selection bar "8 selected / Deselect / Pay" replaces Refresh | R2 `5:12950`, R1 `175:87028` | partial | UI exists (`data-selected-count`, `data-deselect-all`, `data-pay-selected` in HTML line 118) but nothing in JS handles `data-pay-selected`: the button does nothing |
| Pay multiple selection page ("Vendors to Pay", see section 4) | R1 `9015:494885`..`9033:493669` | missing | No multi-pay flow in `payables-pay.js` (grep: no multi / vendors-to-pay) |
| Row actions per tab: Ready to Pay = Pay; In Progress = Cancel (scheduled) / none; Exceptions = Re-run; Paid = none | R2 `5:48198` ("Cancel"), `8:78750` ("Re-run") | done | Wiki table matches |
| Search (payee, ref, etc.) | R2 `5:12950`; R1 `152:152705` | done | 200ms skeleton |
| Filter panel: Filter by Source, Reset all, Apply; R1 adds Supplier name search list, Amount from/to, Filter by date (calendar) | R2 `1559:27884`; R1 `165:139176`, `1772:439587` | partial | Code has many more categories (Amount min/max, Payee, Method, Status, Failure Reason, 3 date ranges, Source). Dates are typed US inputs; no calendar popover (wiki D-09) |
| Active filter tags: date range, supplier, "$1,000 to $10,000" / "Over $1,000"; Clear All; "View all" overflow | R1 `152:152705`, `2166:559286`, `2166:559876` | done / partial | Chips with open/remove exist; "Clear All" and "View all" overflow not verified |
| Filter by Failure Reason (Revoked due to OTP, Revoked due to Security Questions, Revoked due Dispute, Token Expired, Payment Failed, Internal Error) | R2 `6200:127556` | partial | Failure Reason filter exists; code reasons are Approval required / Missing remittance details / Invalid vendor account / Duplicate bill (wiki), not the Figma six |
| Filter by Check Status (Paid and Exceptions) | R2 `4373:176583`, `4373:181258` | missing | No check-status filter or column |
| Column behaviour (sort asc/desc), Manage columns (Active / Available columns, drag) | R2 `6200:138774`, `6200:139607`, `2041:107240` | done | Two-tone sort, drag rows. Figma "Fixed Columns" (Line #, Item) apply to the line-item table, not here |
| Export | not in Figma frames read | differs | Code: format menu (CSV/JSON/Excel/PDF) via `TableExport`. Wiki still says CSV only: stale |
| Skeleton / loading states | not specified in Figma | done | Tab, search, filter, refresh skeletons |
| Alert banner "You have N notifications" / "N unpaid invoices due today - Pay Now" | R2 `5:12950` / R1 | unknown | Not checked on this page |
| Rate lock note "Rate locked until: August 12, 2023 12:45 AM" on hover (Ready to Pay, cross-border) | R2 `5:12950`, `1559:27884` | missing | Not in code |
| Scheduled tooltip "Scheduled for: July 17, 2023 12:45 AM" (In Progress) | R2 `5:48198` | done | `group/scheduled` tooltip |

## 2. Expanded row (details) per tab

| Feature / rule | Figma | Code | Note |
|---|---|---|---|
| Ready to Pay: Payable details = Notes, STATUS, attachments (file01.xml), Activity log ("Payable with record number #... has been created on ...") | R2 `1559:25418` | done | Notes, Attachments, Activity Log sections |
| In Progress: Payment details by type (ACH/RTP/Wire, Card, Check, SD single-party, SD multi-party), Payment Method details (bank: name, holder, routing/account masked, address; card: reveal details; check: number, name, print date, memo), Cancel Payment action | R2 `5:48198`, `51:` text; `5631:*` | partial | Bank and card reveal done; Check details, SD multi-party endorser table (payee, contact, status, feedback score x/5, Needs Response, Disputed) missing |
| Activity log entries Initiation / Pending Initiation / Initiated / Processing / Paid with timestamps, "Show More" | R2 `8:30965`, `2041:107240` | partial | Activity log exists with standard messages (wiki D-11..D-16 deviations); no "Show More" |
| Payable Summary / Sub-items tab (single vs multi line items; Line #, Item, custom/general columns, "View payables") | R2 `2041:83084` Multi, `2041:107240` Single | missing | Expanded row has no line-item or sub-item table |
| Exceptions: details show decline reason and Failed activity ("failed due to being declined by ...") | R2 `8:78750`; Review `1:122948` | partial | Failure reason shown; decline-by-approver variant depends on dual approval (missing) |
| Long text details (long payee/notes) | R1 `2166:561800` | unknown | Not checked |

## 3. Status lifecycle and row actions

| Feature / rule | Figma | Code | Note |
|---|---|---|---|
| Unprocessed -> Pay -> Pay page | R2 `5:12950` | done | `openPayPage` -> `payables-pay.html?view=pay&id&bill` |
| Pay now -> In Progress (Processing); Pending Initiation; Initiated; Processing -> Paid | R2 `5:48198`, `31:151617`, `31:151649`, `31:151681`, `31:151745` | partial | Statuses Processing / Scheduled / Pending Payee Action exist; Pending Initiation, Initiated labels differ (SD uses "Pending Payee Action") |
| Schedule payment -> In Progress "Scheduled" -> Cancel (modal "Cancel Scheduled Payment: Are you sure you want to cancel payment?", Cancel Payment / Go back) | R1 `177:113658` | done | `bp-schedule-cancel-dialog`; text adapted ("move it back to Ready to Pay"); SD variant voids token and returns funds |
| Exceptions: Failed -> Re-run (modal "Re-trigger payment? This will resend the payment to the recipient and move it to In Progress. To re-trigger this payment, please select a date in the future.") | R2 `5631:60644`..`5631:67563` | partial | Re-run confirm dialog exists with origination, recipient, amount, date = today. Figma requires picking a future date; code hard-sets date to today. Figma has 4 flows: Editable / Non-editable x OTP / NO OTP (editable = payment details can be edited before re-run) and "Action Mode": missing |
| Cancel payment in Exceptions ("Cancel payment?" modal, Activity log -> Failed) | R2 `4515:57609`, `5631:60643` | missing | Code has no Cancel on Exceptions |
| "Payment Re-submitted!" modal after Re-run (Payment Initiation / In Progress / Done) | R1 `2166:560466` | missing | Code shows "Re-run confirmed" activity item; no success modal with stepper |
| Failure reasons Revoked due to OTP / Security Questions / Dispute / Token Expired / Payment Failed / Internal Error | R2 `6200:127556` | differs | Different vocabulary (see section 1) |
| Re-run of expired SMART token reuses Pay page (Re-run Payable, card funding) | Review `53:50158` | partial | Re-run goes through a dialog, not the Pay page |
| Void | not found in Figma | n/a | Only "Cancel" and SD "void the token" in code |
| Email notifications / receipts (bulk EFT, check, wire, Zelle, push-to-debit; "Payment submitted on", institution/transit/account masked, remittance PDF with line items, page x of y) | R2 `2175:1816`..`3977:2208` | missing | Out of prototype scope (documents/emails); inventory only. Receipt PDFs for Paid bills exist as sample bill PDFs, not these remittances |

## 4. Pay page (single payment)

| Feature / rule | Figma | Code | Note |
|---|---|---|---|
| Header: "Initiate a Payment", amount + currency, status badge, Refresh, due date, vendor, bill reference, attachments | R2 `31:63655` | done | |
| Payable Summary (ITEM n / quantity / unit price / amount, subtotal/tax/total) and Activity Log, collapsible | R2 `31:63655` | done | Collapsed by default |
| Origination account select with balance, inactive-account warning ("This bank account is inactive. Click here to resolve this issue."), "Add New Bank Account" | R2 `31:63683` | done | Inactive demo account (Regions style), Add New Bank Account persisted in localStorage |
| Origination info bubble "balance shown is as provided by your bank..." | R2 `31:63669`; R1 `44037:206098` | done | |
| Required errors "Origination Account is required." / "Method of Payment is required." | R2 `31:63697` | done | Pay stays enabled, click marks required |
| Payment mode dropdown: Pay now / Schedule a payment / Pay on Due Date | R2 `31:63683`, `31:63711`, `31:63753`; R1 `8971:459635` | differs | Code uses the SH Sandbox model (calendar button: Tomorrow morning, Monday morning, Due date 9 AM ET, Choose another date, Cancel schedule). **Kept on purpose (decision 2026-11-13)**; no "Pay now" mode switch |
| Schedule Date field (MM/DD/YYYY), calendar with Today / Select, info bubble "all scheduled payments will be submitted on selected date starting from 9 AM (ET)" | R2 `31:63711`, `31:63725`, `31:63739`; R1 `44037:209121`, `8971:459647` | done | 9 AM ET text present; code blocks past dates |
| Schedule Date required error (red) | R1 `9015:495015` (multi), `44041:30765` | partial | Single flow marks required fields; schedule-specific "Schedule Date is required" not confirmed |
| Scheduled date beyond due date -> amber warning "The selected scheduled date is beyond the date of some payables" + per-row "Beyond due date" tooltip | R1 `9927:516877` (multi) | partial | Code shows a line comparing chosen day with due date (own addition); exact warning only in multi flow |
| Method list order: ACH (1-3 business days, Recommended), Cross-border, Wire (same business day), Pay with Card, Check (Slowest), SMART Disburse, SMART Exchange, RTP (Not available + message "Payment method is not available for this bank account...") | R2 `31:109363` | partial | Order matches (`PAY_METHOD_ORDER`); no Cross-border / RTP selectable (RTP shown unavailable). Check is present in code. Wiki "Design vs code gaps" is partly stale |
| ACH details: bank name masked, Account Details (holder, routing, account, address), Edit, ERP note "update details in your ERP ... Refresh" | R2 `31:109377` | done | `gp-edit-bank-btn` |
| ACH receiving bank selection | R1 `10055:501772` | unknown | |
| Wire: same as ACH + "you may be charged additional fees by your bank" | R2 `31:152001` | missing | Fee note absent (grep: no "additional fees") |
| Cross-border wire | R2 `31:109363` (option) | missing | No `cross_border` value in table, only method order list |
| Check: check number (#bill), name/company, address, Attention To, amount, print date (default today), memo "Bill # ...", info on print date "choose Pay on Due Date or Schedule" | R2 `31:152143` | done | `checkAttention`, `checkPrintDate` |
| Check insufficient funds: banner "Insufficient Funds ... $(2,553.68)" + confirm modal "Insufficient funds for this payment / Please be aware ... Continue" | R2 `31:152143`, `31:152177` | missing | No insufficient-funds logic (grep: none) |
| Card (virtual card): select card, Manage Cards link, current balance / projected balance, cashback "+$201.00 USD", funding method (Match Payment / Add Funds / Spend Balance with "Not enough funds"), funding amount, deficit offset, sending method (card on file with vendor / Send securely via Delivery Website / Display the card details + final-page note) | R2 `31:152305`..`31:152417`; R1 `9701:935431`..`11374:546951` | partial | Funding methods, deficit, sending methods done. "Match Payment" naming, cashback line and Manage Cards link not found; "Send via SD" sub-option in R1 `11374:546951` (token to email/phone) not confirmed |
| Create Virtual Card: Funding Options, "Attach Card?" modal ("save and attach this card to <vendor>"), "Virtual card created!" with details | R1 `9703:496398`, `9711:508270`, `9722:503999` | done | "Create New Card", pending new card summary |
| ICCP account / Prepaid card / External variants | R1 `9759:517103`, `11694:503689` | missing | No such variants; no text in frames (images only) |
| SMART Disburse: "Where would you like to send the payment link?", Contact Addresses multi-entry (email or phone, suggestions list, typing second contact), confirmation "SMART Disburse Details" | R2 `31:151817`..`31:151873` | done | Contact chips and token service |
| SMART Exchange: same contact flow, "SMART Exchange payment token" | R2 `1443:155810`..`1443:155892` | done | Wiki: do not copy Figma bug (SD wording in SX modal) |
| SX not in network: Suggested Payment Method; Configure Payment Details (Security Questions 1-3, Token Expiration in N days at time (ET), Signature Requirement, Template picker: "default" / templates for initial, subsequent, final payment); "To initiate the payment please complete the token configuration." | R1 `44074:38761`, `44109:34691`, `44177:35501`; R2 `2257:12067`, `2257:13619`, Config `2257:11099` (6 steps: General settings, User view customization, Confirm Identity, Document Presentment, ...) | missing | No token configuration or template picking in code (grep: no security question / token expiration / template) |
| Confirm modal: Pay Now / Schedule Payment / Pay on Due Date button, "Schedule for MM/DD/YYYY", detail card (account details or SD/SX details or card details with Reveal), "Make default payment method" checkbox (remembered, editable in vendor profile), Cancel | R2 `31:109391`, `31:109427`, `31:109463` | done | `pp-confirm-default-method`; copy "Make this the default payment method for <payee>" |
| Success modal "Payment Submitted! / Payment Scheduled! / Payment Scheduled on Due Date!" with stepper Payment Initiation > In Progress > Paid, Done | R2 `31:109409`, `31:109445`, `31:109481` | partial | "Payment Submitted!" and "Payment Scheduled!" found; "Scheduled on Due Date!" variant not found by grep |
| Payment Status View after submit (In Progress Pending Initiation / Initiated / Processing, Exceptions Failed, Paid; Payable Details, Payment Method Details by type, SD single/multi-party contacts with feedback) | R2 `31:151617`..`31:151745` | partial | Pay page shows submitted state; multi-party endorser table and feedback score missing |
| Pay multiple selection: "Vendors to Pay", per-vendor default payment method (ACH bank / SD email / Select payment method link), expandable payables with DUE date, one origination account, confirm modal "Pay Now / Pay $20,100.00" listing vendors by method, Schedule Mode, Pay Due Date Mode, Change Payment mode modal | R1 `9033:489512`, `9015:494991`, `9927:519389`, `9033:493125` | missing | Not built (see section 1) |
| Bulk payment (when enabled) | R2 `1:82965` | missing | Page `1:82965` not read in detail |
| Permission: "Pay Bill" / "Cancel scheduled payment" / "Change Bill Method of Payment" / "Re-Run" as role permissions | Review `96:27853` | missing | No role gating on Pay page or row actions |

## 5. Dual approval (Review file)

| Feature / rule | Figma | Code | Note |
|---|---|---|---|
| Approval limits set per user at invite: Timeframe limits (Daily/Weekly/Monthly), Per Bill/Invoice limit; Global vs Advanced (per method: Cross-border A2A, Push Debit, P Card VC out of Hub, ACH, Check); "Payments above the limit require approval from another user with higher or no limits" | Review `75:34034`, `95:28600`, `95:29940`, `95:32240` | missing | User Management has invite and roles, no limits (not confirmed in this audit; check `um-invite.js`) |
| Roles include "Approval Limits" summary ("Weekly: $100,000. Bill/Invoice: $20,000.") | Review `96:27853` | missing | |
| Initiator view: Pay page with payment above limit -> "Payment Sent for Approval!" modal (Payment Initiation > Done) | Review `1:106770`, `1:107733` | missing | |
| Pending Approval tab: rows with Approve / Decline actions, payment type, bank details, "has been sent for approval on <date> by <initiator>", "Please review this payment for your approval." | Review `1:115424`, `1:117128` | missing | |
| Approve Payment -> "Payment Scheduled on Due Date!" / continues as normal payment; activity "Payment Approved: was approved by <approver>" in In Progress | Review `1:117128`, `1:113575` | missing | |
| Decline Payable modal: "By declining, you are rejecting approval for the selected item. This action cannot be undone."; Decline Reason (required text) | Review `1:117128` | missing | |
| Declined -> Exceptions: "failed due to being declined by <approver>", Failed, Re-run / Re-run Payment | Review `1:122948`, `1:114257` | missing | |
| Initiator "Send Reminder" to approver (email and/or phone, "Reminder Sent on <date> by <user>") | Review `1:109220` | missing | |
| Approver can see discount note "There's a discount available if we pay by [date]." | Review `1:117128` | missing | |
| Thresholds / who approves: "another user with higher or no limits" (rule only, no numbers beyond $100,000 weekly / $20,000 per bill examples) | Review `95:28600` | missing | See Open questions |

## 6. File Manager (batch upload) detail

| Feature / rule | Figma | Code | Note |
|---|---|---|---|
| Visible only when Batch Upload data preference chosen at enrollment | R2 `1:23092` | missing | |
| Download CSV Template list (4 templates) | R2 `1549:25386` | missing | |
| Upload: .csv up to 10MB, drag and drop; errors: duplicate file name, wrong format; loading "Establishing file validation" | R2 `1532:97954` | missing | |
| File table statuses Errors Found / Ready to Process / Processed; actions Process, Cancel, Refresh | R2 `1532:101325`, `1545:20156`, `1547:21576` | missing | |
| Expanded text: "Only 5,000/10,000 records are valid: ... Please fix errors and re-import to overwrite batch data. Initiated payments cannot be overwritten." / "5,000 transactions were successfully imported." / "Importing ... was canceled." | R2 `1532:101459` | missing | |
| Row-level error list (record #, payable error explanation, e.g. cannot be created with approval status Canceled) | R2 `1:23092` | missing | |

## Counts (rows above, approximate)

done 24 / partial 21 / missing 40 / differs 5.

## Top gaps (by importance)

1. Dual approval end to end (Pending Approval tab, Approve / Decline modal with reason, Sent for Approval modal, Send Reminder, approval limits in invite): Review `1:115424`, `1:117128`, `1:109220`, `1:106770`, `95:28600`.
2. Pay multiple selection ("Vendors to Pay", per-vendor method, schedule errors, confirm modal): R1 `9033:489512`, `9015:494991`, `9927:516877`; the "Pay" button in the selection bar is wired to nothing.
3. SMART Exchange not-in-network token configuration (security questions, token expiry, signature, template picker) and "complete token configuration" block: R1 `44074:38761`, `44177:35501`; R2 `2257:12067`.
4. Exceptions: Re-run requires a future date, editable vs non-editable / OTP flows, Cancel payment on Exceptions, "Payment Re-submitted!" modal: R2 `5631:60644`, `4515:57609`; R1 `2166:560466`.
5. Check insufficient-funds banner and confirm modal; Wire bank-fee note; Cross-border and RTP methods: R2 `31:152143`, `31:152177`, `31:152001`.
6. File Manager tab for batch upload (templates, validation errors, Process / Cancel): R2 `1:23092`, `1532:101325`.
7. Expanded row gaps: line items / sub-items table, SD multi-party endorser feedback, Check details, Check Status filter: R2 `2041:83084`, `31:151617`, `4373:176583`.
8. Failure reasons vocabulary (OTP, Security Questions, Dispute, Token Expired, ...): R2 `6200:127556`.

## Open questions (contradictions between files)

- R1 uses an invoice-number column and "Import transactions"; R2 uses bill reference + source. R1 filter has Supplier name + Amount from/to + calendar; R2 only shows "Filter by Source". Which filter set is final? (Code follows neither exactly: it uses the table-filter spec.)
- ~~Payment mode~~ **Decided 2026-11-13 (Andrian): keep the current calendar** (SH Sandbox model: calendar button + recommended times + Schedule for Later dialog). The R2 Pay now / Schedule / Pay on Due Date dropdown is not built.
- Re-run date: R2 says "select a date in the future"; code re-runs today. Is same-day re-run allowed?
- R2 Ready to Pay has no Pending Approval tab; the Review file adds it between Ready to Pay and In Progress. Tab counts, and whether it appears only for businesses with limits, are not specified.
- Approval thresholds: Review shows only examples (weekly $100,000, per bill $20,000, ACH/Check advanced limits). No rule for what happens when two approvers have different limits, or whether the initiator can self-approve.
- R2 "Wire" and "Cross-border" are two separate options; code and wiki list only Wire. Is Cross-border a separate method (A2A)?
- R2 success modal dates are placeholders ("01/23/22", "11/12/2023"); confirmation modal for SX uses "SMART Disburse" wording (known Figma bug).
- R2 In Progress shows both "Pending Initiation" and "Initiated"; code uses "Pending Payee Action" for SD. Are these the same state?
- Status "Past Due" appears as a badge in R2 In Progress; code shows it as an amber due date only.
- Failure reason list: R2 filter (six items, token-related) vs wiki / code (Approval required, Missing remittance details, Invalid vendor account, Duplicate bill). Which is the source?
- Receipts and emails (R2 page `2108:18491`) name an insurance client; use a client code in any doc derived from them.
