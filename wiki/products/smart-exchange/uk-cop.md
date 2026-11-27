---
title: SMART Exchange UK - Account validation with CoP (Preboarding and Onboarding with payment)
type: guide
status: draft
last_reviewed: 2026-11-27
product: smart-exchange
version: "UK"
source: Figma "SD Versioning" 3xOqsx6FVPNEAiSSpPCLJN, board "Account validation - CoP UK - SD - 13.07.26" (20476:105335), desktop 1728 + mobile 375; prototype src/scripts/sx-uk-bank.js (TCDM-5266)
---

# SMART Exchange UK - Account validation with CoP

CoP (Confirmation of Payee) checks that the account holder name and account type match the bank's records before a
payment is sent. **UK only** (`?region=uk`, see the region showcases): the US and Canada flows are unchanged.

Where it runs (decided by Alina, 2026-11-27): on the **bank account step** of both token flows.
- Preboarding: `sx-preboarding/bank-account.html`, Next.
- Onboarding with payment: Send to Bank Account opens a new UK-only step `sx-onboarding/bank-account.html`
  (US / Canada still go straight to Create SMART Exchange), Next.

The dialogs are the frames of the Figma board above (drawn there over the SMART Disburse UK bank summary). The UK bank form
has no Figma in these flows: it is the Preboarding form with UK fields (Name on Account, Account Type Personal / Business,
Sort Code 6 digits, Account Number 8 digits, Confirm Account Number). TODO(confirm) the form against the UK FPS frames (TCDM-5270).

The outcome is simulated: pick it with the **Demo: CoP outcome** bar (top right, on the bank step) or `?cop=<scenario>`.
Default `match` goes on to the next step.

| `?cop=` | Figma | Dialog |
|---|---|---|
| `match` | - | next step |
| `reference` | Additional Information Needed (20465:63532 ... 20586:67522) | asks for the Account Reference (required, max 140), then verifies |
| `reference-nomatch` | Account ref no match, IVCR (20984:64298) | "Update Required", card "Doesn't Match": Account Reference; Edit Details reopens the field (TODO(confirm)) |
| `close-name` | Close Match, MBAM (20843:61593) | card "Close Match": Account Holder Name (amber) |
| `close-name-type` | BAMM / PAMM (20843:68324, 20867:63019) | cards "Close Match" (name) and "Doesn't Match" (account type) |
| `no-name` | ANNM (20905:62630) | card "Doesn't Match": Account Holder Name (red) |
| `no-name-type` | 20905:62831, 20905:63034 | one card "Doesn't Match", both rows |
| `unable` | OPTO / SCNAS / ACNS / AC01 / CASS (20843:70701, 20980:63004) | "Unable to Verify Bank Account", Review all bank details |
| `unavailable` | 20843:71806 | red icon, "Verification Temporarily Unavailable", Try Again / Close |
| `limit` | Limit Reached - Other MoP Available (21061:56231) | "Verification Limit Reached", Choose Another Method (back to the payment step) |
| `limit-none` | Limit Reached - No Alternatives (21061:57097) | same title, Contact Us (opens the Contact Us dialog) |

The reason codes (MBAM, BAMM, PAMM, ANNM, OPTO, SCNAS, ACNS, AC01, CASS, IVCR) appear only in frame names and are not
explained in the design, so scenarios are named by outcome.

## Attempts

Three attempts. The failure dialog of attempt 2 adds "Final attempt, review your details carefully."; a third failure
shows "Verification Limit Reached" (other method available). Changing the demo outcome resets the count.

## Notes

- Dialogs use `OBModal` (flat backdrop, 8px, motion), X top-left as drawn in Figma with the standard dialog X styling, 48px
  tone circle, full-width stacked buttons; 343 wide on phones.
- Tooltips on the result cards ("Close Match", "Doesn't Match", Account Reference) open on hover, focus or tap, above the icon.
- TODO(confirm): the value shown under "Account Holder Name" (Figma sample "Jonathan Alexander Williamson"; the prototype shows
  the entered name) and "Account Type"; mobile tooltip text (Figma carries a stale one, desktop texts are used); the result of Try Again.
