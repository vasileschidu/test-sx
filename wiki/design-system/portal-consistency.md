---
title: Portal consistency audit
type: guide
status: draft
last_reviewed: 2026-10-21
source: code comparison on main, 2026-10-21; Figma references from the SMART Figma Audit (16 Oct 2026), not checked in Figma directly
---

# Portal consistency audit

Elements that should be the same in every Portal-family product (SMART Hub, SMART Exchange, Consumer Portal)
but aren't today. Most deviations are in **SMART Hub (AP)**. **Consumer Portal** is the most up to date with Figma
and is the default reference unless a row says otherwise.

Root cause: the portals share very little UI code. There are three separate table scripts
(`bills-payables-table.js`, `exchanges-table.js`, `consumer-exchanges-table.js`) and two copies of the Payment Preferences
HTML (5,483 vs 2,209 lines).

Status values: **open** · **decided** (target agreed, not built) · **fixed**.

## Top bar

`src/scripts/topbar-component.js` renders two different top bars: `render()` for Hub/Exchange and `renderConsumer()` for Consumer Portal.

| # | Element | Hub / Exchange today | Reference | Status |
|---|---|---|---|---|
| D-01 | Business switcher | Generic menu, "Switch view" list, building icon per row | Consumer: Figma "Business Change" (current business card, initials, view badge) | open |
| D-02 | User menu | Name + email, Profile, Preferences, Privacy Policy, Share Feedback, Sign out | Consumer: Figma "User Dropdown Menu" (name + role, Profile, Sign out) | open |
| D-03 | Notifications | Bell has no click handler | Consumer: Figma "Notification Modal" panel | open |
| D-04 | Title / breadcrumb row | Page title + breadcrumbs inside the top bar | Consumer: no title row in the top bar | open: confirm which Figma wants |
| D-05 | Icons and avatar | Generic assets | Consumer: `src/assets/figma/top-nav/` | open |

## Table filter

Target: [table-filter.md](table-filter.md), per [decision 0002](../decisions/0002-shared-table-filter.md).

| # | Element | Today | Status |
|---|---|---|---|
| D-06 | Filter label vs column header | "Payment Type" vs "Payment Method", "Payment Date" vs "Date Initiated", "Failure Reasons" vs "Failure Reason" (Hub, Exchange); "By customer" vs "Payer" (Consumer) | fixed (2026-10-21) |
| D-07 | Label style | Plain nouns (Bills, Exchange) vs "By …" (Consumer) | fixed (2026-10-21) |
| D-08 | Hidden-column filter | Hub Ready to Pay offers "Payment Date", whose column is hidden and empty, so applying it empties the table; Due Date can't be filtered | revised (2026-10-21): every category now shows on every tab by decision; a filter on a column with no values in that tab returning no rows is intended. Due Date is now filterable |
| D-09 | Date picker | Calendar in Exchange and Consumer; plain inputs in Bills and Vendors | decided: calendar. Exchange and Consumer have it; Hub still missing |
| D-10 | Controls | "Reset" (Bills) vs "Clear" (Consumer); Select all and category search missing in Consumer | Reset + Apply: fixed (2026-10-21). Select all and category search in Consumer: open |
| D-10a | Filters without columns | Hub Vendors filters on Source, Verification, Payment method, Last payment date; none is a column | deferred: Vendors page out of scope for now |
| D-10c | Date columns per tab | Hub showed Date Initiated relabelled as "Payment Date" on Paid; Exchange and Consumer showed Date Initiated on Pending and Paid by default | fixed (2026-10-21): Date Initiated is off by default there; see [date columns](table-filter.md#date-columns-per-portal) |
| D-10d | Manage columns completeness | Date Processed (Exchange, Consumer) and Payment Reference (Consumer) were added per tab in code, so Manage columns never listed them; several columns were removed per tab | fixed (2026-10-21): every column is listed on every tab; tabs set defaults ([Manage columns](table-filter.md#manage-columns)) |
| D-10e | Amount filter | No portal could filter by Amount | fixed (2026-10-21): min / max range in all portals |
| D-10b | Missing category | Exchange has no filter for its Vendor Entry column | fixed (2026-10-21) |

## Bills & Payables expanded row (Hub AP)

Reference: Consumer Portal expanded row (`consumer-exchanges-table.js`, `IS_CONSUMER_TABLE` branches) / Figma.

| # | Element | Bills today | Reference | Status |
|---|---|---|---|---|
| D-11 | Activity log markers | 6px colored dots, 1px line | 14px Figma icons (clock, progress ring, check, cross), 2px line | open |
| D-12 | Activity log content | Raw data entries, sometimes contradictory ("Bank account verified" / "Verification is in progress") | Standard messages: initiated / processed / failed + reason, with "on [date]" | open |
| D-13 | Empty sections | Notes and Attachments hidden when empty | Always shown, "—" when empty | open |
| D-14 | Failure message | Only in the Failure Reason column | Also added to Notes | open |
| D-15 | Payment info | Own payment-method-details layout | Two-column label/value rows with copy and reveal | open |
| D-16 | Status badge | Own style (100 tint + border, square) and label "Failed" | Shared style in Exchange and Consumer (50 tint + inset ring); label "Exception" | open |

## Payment Preferences (Exchange vs Consumer)

Same scripts, but separate drifted HTML: `payment-preferences.html` and `consumer-payment-preferences.html`.

| # | Element | Exchange | Consumer | Status |
|---|---|---|---|---|
| D-17 | Payment Methods tab grid | 2 columns, `500fr / 676fr`, gap 56px | 3 columns (lists span 2), gap 40px | open: Figma audit names [R3] SMART Exchange as the source of truth, so confirm |
| D-18 | Global Preferences spacing and heading | `sm:py-9`, gap 56px, heading `text-xl` | `p-6`, gap 40px, heading `text-base` | open |
| D-19 | Copy | "Select primary method", "Accept Payer's Card · Immediate payment", explanation paragraph | "Select payment method", "Accept Card Payment · No bank account details required, immediate", no paragraph | open: see [glossary](../suite/glossary.md#terminology-not-yet-agreed) |

## SMART Disburse (found 2026-11-02)

| # | Element | Today | Status |
|---|---|---|---|
| D-30 | Emailed link vs flow | The token email link carries `flow=sd`; the flow only knows `us` / `multi-party`, so the link opens whichever flow the tab used last | open |
| D-31 | Legacy screens | `signature.html`, `summary.html`, `create-account.html`, `complete.html` are off the main path, but the stepper's Complete Payment step still links to `create-account.html` | open: remove or relink |
| D-32 | Declined copy | `declined.html` heading reads "Your SMART Disburse access has been revoked" although the payee declined | open: confirm wording with Figma |
| D-33 | Hub status after payee action | Nothing the payee does (submit, decline, revoked) updates Hub; the payable stays "Pending Payee Action" | open: prototype limitation |

## STP (found 2026-11-05)

See [STP](../products/smart-exchange/stp.md). Code: `src/scripts/stp-state.js`, `src/scripts/pages/payment-preferences-page.js`,
`src/scripts/topbar-component.js`, `src/scripts/exchanges-table.js`.

| # | Element | Today | Status |
|---|---|---|---|
| D-34 | Opt-in flow vs product owner | Product owner: opt in from the SX token flow (Card), answer "Authorized Signer?" (Yes: accept, No: send to a signer with name + email), then the penny test. Code: portal only, no signer question, email only, and an extra Process Any Payment / Terminal Verification step before the penny test | open: confirm with the product owner and Figma [R3] SMART Exchange, page STP |
| D-35 | Opt in / Review outside Payment Preferences | On other Portal pages the banner's **Opt in** and **Review** open the store's own agreement dialog: no email step, and **Confirm** doesn't change the state | open |
| D-36 | Setup steps dialog | Every **Learn more**, **Don't see a small deposit?** and the re-verify link open one dialog that always shows steps 1–2 done and a **Verify now** button, so any state, even before opting in, can jump to *Enabled* | open |
| D-37 | Banner audience | The STP banner checks only `hideStp`, so it also shows in the Buyer view (Hub pages) and the Transcard view; only Consumer Portal hides it | open: confirm who should see it |
| D-38 | Naming | "Interested in **Automated** Card Processing?" (blue banner) vs "**Automatic** Card Processing" everywhere else; button "Confirm" vs "Confirm Acceptance" (product owner) | open |
| D-39 | Consumer Payment Preferences | Carries unused copies of the STP dialogs (enable, setup steps, verify, opt-out) but no STP card | open: remove |
| D-40 | Get paid STP toggle | `exchanges-table.js` advances STP when Get paid is submitted with an "enable STP" toggle on (`#gp-stp-*`), but no page renders it; the guide's **Done** is the only path to bank verification | open: remove or rebuild |
| D-41 | Agreement link and state | The link's token is stripped and never checked (expiry not enforced); state is per browser, so a signer on another device doesn't move the requester's state; penny test accepts any amount | open: prototype limitation |

## Other

| # | Element | Today | Status |
|---|---|---|---|
| D-20 | Rows per page | Bills 10/25/50/100 · Consumer 5/10/25/50/100 · Vendors 10/25/50 | open |
| D-21 | Toolbar title and search placeholder | "Payments Overview" (Hub) vs "Payments" (Exchange); "Search vendors..." vs "Search" | open |
