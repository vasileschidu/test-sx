---
title: SMART Enroll - element states and interactions (SE In Progress)
type: reference
product: smart-enroll
last_reviewed: 2026-11-26
source: SE (In Progress) JXlBv04yGfuOpi0BnNtq7H
---

# SMART Enroll: states and interactions

States/interactions source per [overview.md](overview.md) "Figma sources" rule (content/copy = R1, element states + what an action triggers = SE file, Master Components `4349:433623`). Read-only dump, 2026-11-26. Colours are the Tailwind names of the bound Figma variables (`main-color/N` = blue-N, `secondary-color/N` = not resolved). Link base: `https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=`.

## Add-on row: Main Menu/Add-ons ([4511-377691](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-377691))
Variants: Type = AP/AR Payments, Merchant Services, Cross Border Disbursements, SCF; Added On/Off; State Default/Hover; Sticked/Not editable True/False. Row h52, w286 (AP/AR) or 316, radius 6 (rounded-md). Trailing slot always holds the Info Bubble trigger.

| State/variant | Visual | Notes |
|---|---|---|
| Not added, default | bg white, border 1px gray-200, radius 6; leading 20px plus in circle with 2px gray-300 ring (radius 16); label blue-600 | Whole row = add control |
| Not added, hover | bg gray-50, border 1px gray-200; plus ring 2px blue-500; label blue-600 | Only Added=Off has a hover variant |
| Added, default | bg white, border **2px blue-600**, radius 6, two drop shadows (0 10 10 -5 black 4%; -3 20 25 -5 black 10%); leading = gradient product logo (radius 46 / 100 for SCF); label gray-800; status icon `In Progress` (blue-500 lined spinner) | Trailing: Info Bubble + X (20px, Actions button) = remove |
| Added, hover | not drawn | |
| Sticked / Not editable (Added=Off, True) | bg white, border 1px gray-200; gradient logo; label gray-800; status icon `Clock` (blue-500); trailing Info Bubble only | Used for "Current features" in Pending Approval / Approved menu; no plus, no X |
| Pressed / focus (row) | not drawn | |
| Disabled | not drawn (Sticked/Not editable is the closest) | |
| Error / loading | not drawn | |

## Actions icon button ([4511-349324](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349324))
Sizes Large 40 / Small 22, radius 6, 20px plus icon.

| State | Visual | Notes |
|---|---|---|
| Default | no bg, no border; icon gray-400 | |
| Hover | bg gray-100; icon gray-500 | |
| Focused | bg white, border 2px blue-600; icon gray-400 | Focus ring is a 2px blue-600 border |
| Pressed / disabled / error / loading | not drawn | |

## Info Bubbles ([4511-349353](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349353))
22px Actions button with info-circle duotone icon, Types AP/AR Payments, Cross Border Payments, Merchant Services, SCF. Same set exists for Business Info ([4929-492616](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-492616), Customer Support Details, 40px) and generic ([11102-341033](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=11102-341033)).

| State | Visual | Notes |
|---|---|---|
| Default | no bg; icon gray-400 | |
| Hover | bg gray-100, radius 6; icon gray-500; (prototype: hover swaps to Focus variant) | Prototype `ON_HOVER` -> variant `4511:349358` with SMART_ANIMATE |
| Focus | bg white, border 2px blue-600, icon gray-500; tooltip card opens to the right: bg gray-900, radius 8, shadow, inner rows bg white/8% radius 7, title gray-50, text gray-300, badge tinted | AP/AR and SCF tooltips show two cards (AP Payments + AR Payments); Cross Border and Merchant Services show one card with 72px logo + badge |
| Disabled / error | not drawn | |

Info Bubbles Card ([4511-349551](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349551)) is the tooltip body (Types AP & AR, Merchant Services, Cross Border, SCF).

## Application Progress ([5357-353465](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=5357-353465)) and Main Menu status ([4511-349454](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349454))
Status box = Info Box, radius 6, with 20px icon, title (800) and description (700). Badge top-right radius 512 (pill).

| Status | Visual | Notes |
|---|---|---|
| Pending Enrollment Data | Info Box bg blue-50; icon `Clipboard copy` blue-400; title blue-800; text blue-700. Badge bg blue-100, border 1px blue-200. Progress bar track blue-100 (radius 10), gradient fill | Menu: "What are you looking to do?" panel (bg gray-50, radius 8) with all 4 add-on rows; no "Go to SMART Hub" button; h610 |
| Pending Approval | Info Box bg blue-50; icon `Clock` blue-400; title blue-800; text blue-700. Badge bg blue-100 / border blue-200 | Menu adds primary button "Go to SMART Hub" (bg blue-600, white text, radius 6, shadow), "Current features" panel (added rows, Sticked) and "What are you looking to do?" panel for the rest; h700 |
| Approved | Info Box bg **green-50**; icon `Check circle` green-500; title green-800; text green-700. Badge bg green-100, border green-200 | Same layout as Pending Approval; h680 |
| Hover / focus / error / loading | not drawn | |

Component set `Main Menu` (4511:349454) wrapper: bg white, radius 10, 2 shadows. Application Progress/Bar ([4511-349235](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349235)): Progress 12.5/25/30/50/75/100, Type Large Rounded / Small Squared.

## Transcard Support ([4511-349436](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349436))
| State | Visual | Notes |
|---|---|---|
| Off | ghost button "Help from Transcard", 20px question-mark icon gray-400, text gray-500, radius 6 | Hover/focus/pressed of the button not drawn |
| On | same button + popover: bg white, radius 8, 3 shadows, leading gradient SMART Hub icon (pill) + text, separator gray-200, two white buttons | Popover content: [4511-349529](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4511-349529) (Dropdown, Mobile/Desktop) |

## Step Tabs Status Icons ([4944-363327](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4944-363327))
18px icons. Tab status wrapper: [4938-363081](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4938-363081) (Tab integration/information/configuration x Dropdown false/true; dropdown = tooltip bg gray-900, radius 8, rows gray-800).

| State | Icon | Colour |
|---|---|---|
| None | `Dot` solid | gray-400 |
| In progress | `In Progress` lined spinner | blue-500 |
| Pending Approval | `Clock` solid | blue-500 |
| Approved | `Check circle` solid | green-500 |
| Error | `Exclamation circle` solid | amber-500 (#f59e0b, unbound) |

## Badge ([5385-385066](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=5385-385066)) and Connector Status ([4515-353665](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4515-353665))
Badge: h20, radius 4, border 1px, icon 20px + text.

| Variant | Visual | Notes |
|---|---|---|
| Not Started | bg gray-100, border gray-200, icon `X circle` gray-400, text gray-800 (gray-900 in Connector Status) | |
| In progress | bg blue-100, border blue-200, icon `In Progress` blue-400, text blue-800 | |
| Connected (Connector Status only) | bg green-100, border green-200, icon `Check circle`, text green-800 | |
| Error - Red / Yellow (Small icon only) | icon `Exclamation` red-500 / amber-500 (#f59e0b) | Large error badge: not read |
| Hover/disabled | not drawn | |

## Buttons-Toggle YES/NO ([4929-491507](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-491507))
48x32, radius 6, border 1px.

| Active | State | Visual |
|---|---|---|
| False | Default | bg white, border gray-300, text gray-700 |
| False | Hover | bg white, border gray-400, text gray-900 |
| False | Focused | same as Hover (no ring drawn) |
| False | Disabled | bg white, border gray-400, text gray-500 |
| True | Default | bg blue-50, border blue-300, text blue-700 |
| True | Hover | bg blue-100, border blue-400, text blue-800 |
| True | Focused | same as Default (no ring drawn) |
| True | Disabled | bg blue-100, border blue-400, text gray-500 |

## Other Info Tabs elements
| Component | State | Visual | Notes |
|---|---|---|---|
| Add Owner Button [4929-491770](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-491770) | Default | bg white, border 1px gray-200, radius 80 pill; user-add icon in 2px gray-300 ring; label blue-600 | |
| | Hover | ring 2px blue-400 | bg unchanged |
| | Focused | identical to Default | focus ring not drawn |
| Generate Business Plan Button [4929-491919](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-491919) | Default | bg blue-600, radius 10, white text "Get Started Now" | |
| | Hover | bg blue-700 | |
| Card Payments [4929-491903](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-491903) | Off | bg white, border gray-300, radius 8, checkbox bg white / border gray-300 radius 4 | Checkbox card |
| | On | header bg blue-50 / border blue-300, checkbox filled secondary-color/600, text fields expand below | |
| | Error | border red-300 | |
| Years Estimation [4929-491930](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-491930) | collapsed | bg gray-50 (mobile gray-100), border gray-300, radius 8, plus icon gray-500 | |
| | expanded | same frame, minus icon, fields below | |
| Logo Upload [4929-492497](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-492497) | Off | placeholder bg gray-50, border 2px gray-300 (dashed not confirmed), radius 30 (icon) / 8 (logo); Secondary button | |
| | On | purple preview (#7c3aed), Secondary + red-400 outlined remove button | |
| | Error | error frame (colours not read) | |
| Review Info Drops [5280-338651](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=5280-338651) | Default | bg white, border 1px gray-300, radius 6, chevron-down gray-500 | Types Business Info, Ownership, Financial, Business Plan |
| | Missing required info | bg yellow-50, border yellow-300, badge yellow-100/yellow-200, white "button" with gray-300 border | |
| | Open | header bg gray-50 (yellow-50 if missing), chevron up, content below | Hover state of the row: variant exists, not read |
| Info Box/Custom [4515-353751](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4515-353751) | 7 days | bg yellow-50 | |
| | 2 days / Expired / First time / Not validated | bg red-50 | Connector expiry boxes |
| Dropdowns: Bank ID [4515-353166](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4515-353166), Country [21802-31129](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=21802-31129), Currency [21802-31145](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=21802-31145) | Default / Filled | input bg white, border 1px gray-300, radius 6 | |
| | Open | + dropdown menu bg white radius 6 | |
| | Disabled (Country/Currency) | input bg gray-50, border gray-300 | Bank ID has no Disabled |
| | Error (Country/Currency) | border red-300, help text red-600 "Country is required" | |

Not read in detail (exist on the page): SE/Info Tabs [4929-349174](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=4929-349174) (Tab x Completed On/Off x Platform; + Merchant Service / + SCF props), Connector Element/Modals (ERP/Bank Connect steps), Submit Modal-Steps [5280-338858](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/?node-id=5280-338858) (Steps 1-4, 3.1-3.3), Signatory Section, Owners, Main Tab, SX Preferences, Invoice amount/TRF (Default/Hover).

## Interactions
Prototype reactions are sparse; most flows are sequences of numbered frames.

| Trigger (element + area) | Result | Frame id | Drawn / inferred |
|---|---|---|---|
| Add-on row (Not added) in progress menu (Integration tab) | Row becomes Added=On (2px blue-600 border, shadow, gradient logo, spinner, X). Merchant Services / SCF add the "+ Merchant Service" / "+ SCF" tabs and sections in the Financial / Merchant Services tab (see sections "Financial TAB - Merchant Service(CA)", "SCF", "SCF + MS" and Info Tabs props). No modal is drawn for adding | add-on rows in 1321:449520 etc.; sections 15528:169923, 15528:367465, 15528:376968 | inferred |
| X on added add-on row | Removes the add-on (row returns to Added=Off) | 4511:377691 | inferred (X drawn, no target frame) |
| Info bubble (add-on row) hover/focus | Dark tooltip card to the right of the menu | 1321:449520 (AP/AR), 1321:492935 (SCF), 1321:494423 (Merchant Services); reaction 1724:577022 | drawn (prototype ON_HOVER -> Focus variant) |
| "Help from Transcard" (progress menu) | Support popover opens (Transcard Support On) | 1321:495875 | drawn (frame), inferred click |
| Tab status icon hover (Integration / Information / Configuration tabs) | Dark status tooltip; descriptions in Status Description | 1240:272484; 5242:334567 (Progress), 5242:334578 (Error), 5242:334595 (Completed); reactions ON_HOVER SMART_ANIMATE | drawn |
| "Next Step" / previous-next arrows (header, Integration tab) | NAVIGATE reaction without a destination (4977:342807, 4977:342808) | 1240:272484 | drawn, destination missing |
| Same Next buttons in Information tab (4967:520792, 4967:520793) and Configuration tab (5136:335130, 5136:335131) | NAVIGATE reaction without a destination | 4991:343057; 5136:333008 | drawn, destination missing |
| Accounting Software "Connect" | ERP connect modal flow: 7 default -> 7.2 selected -> 7.3 ... 7.5 -> 7.5.1 -> 7.6 connected / 7.7 info fields error / 7.7 disconnected | 117:50285, 120:48381, 120:48881, 120:49381, 120:49881, 120:50381, 5360:343198, 2099:424842 | inferred from sequence |
| Bank account "Connect" | Bank connect flow: 8.2 -> 8.3 -> 8.4 -> 8.5 connecting -> 8.5.1 -> 8.6 -> 8.6.1 -> 8.7 -> 8.8 multiple accounts -> 8.9 / 8.10 | 1406:335838 ... 1406:341473, 4442:338643, 5360:356114, 5376:368332 | inferred from sequence |
| Bank account radio card (8.4) | Prototype CHANGE_TO Radio Group/Card Focus, Selected=False | 10122:347940 (reaction 10124:349235) | drawn |
| "Invite people" (header) | Invite flow: 6 default -> 6.1 predictive email -> 6.2 filled -> 6.3 filled/change -> 6.4 error | 100:12345, 100:13076, 100:13086, 100:13096, 5459:351849 | inferred from sequence |
| Business dropdown (header) | Change business dropdown open | 1326:336443 | drawn (frame) |
| Bank account Error (Integration tab) | Error state of connector element | 6017:347689 | drawn |
| Speedy Signup radio card (Business Results) | Prototype CHANGE_TO Focus/Selected=False; then 3.1 Selected | 1257:412519 -> 1257:474953 (reactions 1257:474946, 1257:474939) | drawn |
| Login Profile Item hover | CHANGE_TO State=Hover | 1249:610745 (reactions on profile items) | drawn |
| Speedy Signup path | 1 -> 1.1 filled -> 1.2 code sent -> 1.3 code filled -> 1.4 email code -> 2 EIN/Tax ID -> 2.1 filled -> 2.2 T&C -> 3 Business Results -> 3.1 selected -> 4 Company Profile -> 4.1 filled. Errors: 1.6, 1.7 code required, 1.8 code wrong, 2.3 EIN error, 4.2 profile error | 7:1248 ... 5458:402092 | inferred from names |
| Login path | 1.0.1 email -> 1.0.2 code -> (or 1.0.3 phone -> 1.0.4 code) -> 1.0.5 choose profile -> 1.0.6 search; errors 1.0.7 email required / wrong | 1249:473272 ... 5459:351764 | inferred from names |
| Information tab tabs | Business Information, Ownership, Financial, Merchant Services, Business Plan TABs are separate sections | 4991:343057 ... 4991:343061 | drawn as sections (no click reactions inside) |
| Configuration tab | 14 default -> 14.1 account dropdown open -> 14.2 rate field focused | 5136:333008, 5136:335137, 5138:335519 | inferred from names |
| Submit (Next Step on last step) | Submit modal: Step 1 -> Step 2 -> Step 3 (terms) -> 3.1 Authorized Signatory -> 3.2 Agreed -> Step 4 Information Received | 192:103985, 192:133984, 192:134594, 192:135583, 192:136031, 192:135143 (mobile: 1577:418412, 1577:511742, 1577:511896) | inferred from names |
| Review Info Drops row click | Row expands (Open variant) | 5280:338651 | inferred |
| Submit failure | "Business Information - Submittion Fail" frame | 1696:511527 | drawn (trigger not stated) |

## Open questions
- Adding an add-on: no frame or reaction shows a confirm modal or inline step; behaviour above is inferred from Added=On variant and the Financial TAB sections. Confirm with design (modal vs direct toggle; what the X does).
- Added=On row has no hover/pressed/focus variant; Added=Off has hover only. No focus ring variant for the row.
- Buttons-Toggle Focused = Default/Hover visually (no ring); Add Owner Focused = Default. Decide focus style (Actions uses 2px blue-600 border).
- `secondary-color/600` (Card Payments checkbox) not resolved to a Tailwind name; amber-500 error icon is an unbound hex.
- Many NAVIGATE reactions have no destination (Next Step, Next/Previous arrows).
- Large error badge (Connector Status Error variants), Info Tabs, Submit Modal-Steps, Transcard popover buttons were not dumped; hover/disabled of those not read.
- Dashed border on empty states / Logo Upload placeholder not confirmed from data (stroke width only).
- Progress bar fill is a gradient (colours not read).
