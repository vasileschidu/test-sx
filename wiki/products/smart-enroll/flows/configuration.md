---
title: SMART Enroll — Configuration tab
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: configuration
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28566-45739
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO section 28566:45739 on 2026-11-17; needs human review
---

# Configuration tab

Always shown, last tab. Index: [standard.md](../standard.md).
Figma: [28566:45740](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28566-45740) ·
[account select 28615:40095](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28615-40095)

"This is the first step to configuring your SMART Hub and adjacent payment solutions. You'll be able to change these in
the SMART Hub portal as well."

## SMART Exchange Payment Preferences
"SMART Exchange is an option you can enable for instant payments. What is SMART Exchange?" — toggle (off by default).
When on:

| Field | Rule |
|---|---|
| Select Default Receiving Account | required; lists the Connected bank accounts from [Connectors](connectors.md) + "Add New Bank Account" (→ Connectors bank flow) |
| Min. invoice amount | optional, USD |
| Max. invoice amount | optional, USD, must be ≥ min |

"Please set the minimum and maximum value of each invoice that you would like to be eligible for payment through SMART
Exchange. If no values are entered, all invoices will be eligible." **Save**.

## Rules
- The tab counts as complete when it was saved once (toggle off is a valid answer).
- TODO(confirm): error text for max < min (not drawn); prototype: "Max. invoice amount must be greater than Min. invoice amount."
