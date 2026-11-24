---
title: SMART Enroll — Cross-Border Payments add-on
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: cross-border
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28598-246304
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO page 28598:246304 on 2026-11-17; needs human review
---

# Cross-Border Payments add-on

Added from the left panel (⊕). Adds the **Transactional** tab and an **FX Provider** block in Connectors.
Removing it discards both ([application-shell.md](application-shell.md#adding-and-removing-add-ons-d-11)).
Index: [standard.md](../standard.md).

## Transactional tab
Figma: [28603:49485](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28603-49485) ·
[errors 28665:83864](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28665-83864)

"Cross Border Transactions — Give us a few details on the nature of your cross-border transactions and expected volume
split by foreign currencies."

| Field | Rule |
|---|---|
| Estimated number of transactions for the next 12 months | required, whole number (Figma typo "transcations" fixed) |
| Average transaction value | required, USD |
| Highest transaction value | required, USD |
| Purpose of Transactions | required, textarea, help "Provide a short description, preferably 1 or 2 sentences." |
| Are you involved in any of the following activities? | required, **one** YES / NO for the list: Dealer of precious stones · Dealer in weapons · Dealer in virtual currency · Controlled substances related · Are you a financial institution |

Order as in Figma (earlier drafts listed Highest first and a Yes/No per activity: DS-019). 5 required answers feed the
tab progress. Errors: "<Field> is required." on leaving an empty field; "Select Yes or No." (TODO confirm).
Prototype: `src/scripts/smart-enroll/cross-border.js` (TCDM-5249).

## FX Provider
In the Connectors tab, below Bank Account. Figma: [28603:106195](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28603-106195).

"Choose one or more preferred FX providers…" Provider card (Monex: phone, email) with **Begin Setup** ▾:
- *Already have an account* → dialog "Link your existing Monex account…" (steps 1–3, Contact Details, disclaimer) →
  Confirm → **In Progress** badge + ⋯ menu (View details / Cancel).
- *Don't have an account* → dialog "Begin exploring and setting up an account with Monex" ("Get started now · Set up
  with Monex →" opens the Monex site) → Confirm → In Progress.
- View details = the same dialog with one **Cancel request** button; Cancel request (or menu Cancel) resets the provider
  to Begin Setup. Figma has no confirm step for it (TODO confirm).

Disclaimer: "Transcard connects you with [provider]… We are not a licensed money transmitter…".
Not required to submit (same rule as other connectors, D-13).
