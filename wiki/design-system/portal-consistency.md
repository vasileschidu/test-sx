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
| D-08 | Hidden-column filter | Hub Ready to Pay offers "Payment Date", whose column is hidden and empty, so applying it empties the table; Due Date can't be filtered | fixed (2026-10-21) |
| D-09 | Date picker | Calendar in Exchange and Consumer; plain inputs in Bills and Vendors | decided: calendar. Exchange and Consumer have it; Hub still missing |
| D-10 | Controls | "Reset" (Bills) vs "Clear" (Consumer); Select all and category search missing in Consumer | Reset + Apply: fixed (2026-10-21). Select all and category search in Consumer: open |
| D-10a | Filters without columns | Hub Vendors filters on Source, Verification, Payment method, Last payment date; none is a column | deferred: Vendors page out of scope for now |
| D-10c | Date columns per tab | Hub showed Date Initiated relabelled as "Payment Date" on Paid; Exchange and Consumer showed Date Initiated on Pending and Paid | fixed (2026-10-21): see [date columns](table-filter.md#date-columns-per-portal) |
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

## Other

| # | Element | Today | Status |
|---|---|---|---|
| D-20 | Rows per page | Bills 10/25/50/100 · Consumer 5/10/25/50/100 · Vendors 10/25/50 | open |
| D-21 | Toolbar title and search placeholder | "Payments Overview" (Hub) vs "Payments" (Exchange); "Search vendors..." vs "Search" | open |
