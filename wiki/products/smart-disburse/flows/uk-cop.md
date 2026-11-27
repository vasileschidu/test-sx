---
title: SMART Disburse UK - Account validation with CoP
type: guide
status: draft
last_reviewed: 2026-11-27
product: smart-disburse
version: "UK"
source: Figma "SD Versioning" 3xOqsx6FVPNEAiSSpPCLJN, board "Account validation - CoP UK - SD - 13.07.26" (20476:105335), desktop 1728 + mobile 375; prototype src/pages/sd-uk/bank-summary.html + src/scripts/sd-uk-cop.js (TCDM-5266)
---

# SMART Disburse UK - Account validation with CoP

CoP (Confirmation of Payee) checks that the account holder name (and account type) match the bank's records
before a payment is sent. In the prototype the check runs when the payee confirms the deposit on the bank
summary page ("One Final Step", `Deposit` button). The outcome is simulated: pick it with the **Demo: CoP
outcome** bar (bottom right of that page) or `?cop=<scenario>`; default `match` leaves the flow unchanged.

Note: TCDM-5266 is titled "SX UK", but the Figma frames are the SMART Disburse UK bank flow, so it is built there
(TODO(confirm) whether SMART Exchange needs the same).

## Scenarios

| `?cop=` | Figma | Dialog |
|---|---|---|
| `match` | - | deposit goes on to the done page |
| `reference` | Additional Information Needed (20465:63532 ... 20586:67522) | asks for the **Account Reference** (required, max 140 characters), then verifies |
| `reference-nomatch` | Account ref no match, IVCR (20984:64298) | "Update Required", card "Doesn't Match": Account Reference; Edit Details reopens the field (TODO(confirm)) |
| `close-name` | Close Match, MBAM (20843:61593) | "Update Required", card "Close Match": Account Holder Name (amber) |
| `close-name-type` | Close Match + Account Type no match, BAMM / PAMM (20843:68324, 20867:63019) | cards "Close Match" (name) and "Doesn't Match" (account type) |
| `no-name` | No match, ANNM (20905:62630) | card "Doesn't Match": Account Holder Name (red) |
| `no-name-type` | No match, name + account type (20905:62831, 20905:63034) | one card "Doesn't Match" with both rows |
| `unable` | Unable to verify, OPTO / SCNAS / ACNS / AC01 / CASS (20843:70701, 20980:63004) | "Unable to Verify Bank Account", button Review all bank details |
| `unavailable` | Verification unavailable (20843:71806) | red icon, "Verification Temporarily Unavailable", Try Again / Close |
| `limit` | Limit Reached - Other MoP Available (21061:56231) | "Verification Limit Reached", Choose Another Method (payment page) |
| `limit-none` | Limit Reached - No Alternatives (21061:57097) | same title, Contact Us (contact page) |

The design names the reason codes (MBAM, BAMM, PAMM, ANNM, OPTO, SCNAS, ACNS, AC01, CASS, IVCR) only in frame
names and does not explain them, so the prototype names scenarios by outcome.

## Attempts

Three attempts (`MAX_ATTEMPTS`). Each failed check counts. The failure dialog of attempt 2 adds the note
"Final attempt, review your details carefully."; a third failure shows "Verification Limit Reached" (other
method available). Changing the demo outcome resets the count.

## Behaviour notes

- Every dialog: X (top-left, as drawn in Figma, Decline-dialog styling), 48 px circle icon (amber warning, red x, blue bank),
  heading, body, result cards or field, full-width stacked buttons. Mobile 343 wide, same content.
- Result cards: header "Close Match" or "Doesn't Match" + information-circle tooltip (hover, focus or tap) with the texts
  from Figma (name, account type, both as a numbered list, account reference).
- Edit Details and Review all bank details open the bank details page; Try Again re-runs the check.
- TODO(confirm): the value under "Account Holder Name" (Figma sample "Jonathan Alexander Williamson", the prototype shows the
  entered holder) and "Account Type" ("Personal"); the Figma Close Match tooltips on mobile carry a stale text, desktop texts are used.
