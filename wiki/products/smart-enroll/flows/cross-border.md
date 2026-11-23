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
| Highest transaction value | required, USD |
| Estimated number of transactions for the next 12 months | required (Figma typo "transcations" fixed) |
| Average transaction value | required, USD |
| Purpose of Transactions | required |
| Are you involved in any of the following activities? | Yes/No each: Dealer of precious stones · Dealer of weapons · Dealer of virtual currency · Controlled substances related · Are you a financial institution |

Errors: "<Field> is required."

## FX Provider
In the Connectors tab, below Bank Account. Figma: [28603:106195](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28603-106195).

"Choose one or more preferred FX providers…" Provider card (Monex: phone, email) with **Begin Setup** ▾:
- *Already have an account* → linking steps 1–3 → In Progress (View details / Cancel request).
- *Don't have an account* → "Set up with Monex" request → In Progress.

Disclaimer: "Transcard connects you with [provider]… We are not a licensed money transmitter…".
Not required to submit (same rule as other connectors, D-13).
