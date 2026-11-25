---
title: SMART Enroll — Application shell, statuses and progress
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: application-shell
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28107-8955
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO frames 28107:8955, 28471:37074, section 28370:15445 on 2026-11-17; decisions D-10, D-11, D-12, D-14 (defaults accepted 2026-11-18); needs human review
---

# Application shell

The frame every application tab lives in. Index: [standard.md](../standard.md).
Figma: [menu anatomy 28107:8955](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28107-8955) ·
[standard frame 28471:37074](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-37074).

SMART Enroll is its own product with its own shell (`src/pages/smart-enroll/`). It does **not** use `<app-nav>` /
`<app-topbar>` from the Hub; it gets its own shared shell script inside the product folder.

## Top bar
SMART Hub logo · **Invite people** (+ info icon) · avatars of people on the application · business switcher
(name + chevrons → Choose a Business) · **Next Step** (primary, goes to the next tab; on the last tab it opens
[Submission](submission.md)).

## Left panel
1. **Application Progress** — % badge + bar (rule below).
2. **Status box** — only after the first submission (statuses below).
3. **What are you looking to do?** — product list, each with ⊕ to add and an info icon:
   - AP/AR Payments — base, always selected, cannot be removed.
   - Supply Chain Financing — shown **disabled with a "Coming soon" badge** (D-10).
   - Merchant Services — add-on, see [merchant-services.md](merchant-services.md).
   - Cross-Border Payments — add-on, see [cross-border.md](cross-border.md).
4. **Help from Transcard** (collapsible) — "SMART Suite Knowledge Base — To view all SMART Suite FAQs and Transcard User Guides…".
5. Footer: Powered by Transcard · Terms of Use • Privacy Policy.

### Adding and removing add-ons (D-11)
- ⊕ adds the product: its tabs appear and the progress % is recomputed.
- An added add-on can be removed. Confirm dialog "Information will be discarded" — everything entered for it
  (its tabs, its Ownership/Connectors extras) is deleted. Cancel keeps it.

## Main card and tabs
Card header: card title (the Figma heading, longer than the tab label on some tabs: Beneficial Ownership,
Connections for Integration, Business and Financial Information, Cross Border Transactions) + description + Invite people + avatars. Footer: ‹ previous tab / next tab ›.
Each tab has a status icon: ✓ complete, spinner = in progress, empty = not started.

| Tab | Shown when | Page |
|---|---|---|
| Business Information | always | [business-information.md](business-information.md) |
| Ownership | always | [ownership.md](ownership.md) |
| Financial | Merchant Services added | [merchant-services.md](merchant-services.md) |
| Transactional | Cross-Border Payments added | [cross-border.md](cross-border.md) |
| Business Plan | Merchant Services added | [merchant-services.md](merchant-services.md) |
| Connectors | always | [connectors.md](connectors.md) |
| Configuration | always | [configuration.md](configuration.md) |

## Progress (D-12)
`progress % = required fields filled ÷ all required fields`, over every visible tab, rounded down.
Optional fields don't count. A tab is ✓ when all its required fields are filled and valid.

## Statuses (D-12)
Set by compliance in the back office. The prototype simulates them with a floating "Demo status" switcher at the bottom right (also `?status=<id>`).
The application is **editable only before submission and in Pending enrollment data**; every other status is read-only.

| Status | Colour | Status box text | Figma |
|---|---|---|---|
| Pending enrollment data | amber | "Your application is under review and additional information is needed. You should have received an email from our customer service team indicating that information, if you have not received an email, please contact our Customer Service team at <support phone>" | [28471:32962](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-32962) |
| Pending Approval | TODO(confirm) | "We are completing our final checks and setups for you to use SMART Hub. You'll receive an email soon when the process is complete. If you have any questions, please contact our Customer Service team at <support phone>" | [28471:31765](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-31765) |
| Approved | green | "Your application to use SMART Hub has been approved. You should have received an email with your SMART Hub URL. If you did not receive an email, please contact our Customer Service team at <support phone>" | [28471:33991](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-33991) |
| Declined | red | "Unfortunately, your application has been declined based on the information that we received as part of the enrollment process. If you believe that our decision was made in error, please contact a member of our Customer Service team at <support phone>" | [28471:35020](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-35020) |
| Suspended | red | "Your SMART Hub account has been suspended following an internal review. If you believe this to be an error, please contact a member of our Customer Service team at <support phone>" | [28471:36047](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-36047) |

Lifecycle: *Not submitted* → (Submit) → Pending Approval → Approved / Declined / Pending enrollment data
(→ edit → resubmit → Pending Approval). Approved → Suspended (and back) is a back-office action.
Once Approved, sign-in shows Select Platform ([sign-in.md](sign-in.md)).

## Invite people (D-14)
Reuses the User Management **Invite People** modal (Invite / Members tabs). The invitee gets the role
**Contributor** on this application only: can fill and edit tabs, cannot submit or sign. Their avatar appears in the top bar.
"Invite someone to help" links inside tabs open the same modal (put `data-se-invite="<where>"` on the link).

Prototype: the modal offers only Contributor (preselected, no Create Role); it has two tabs, **Invite** and **Members**
(everyone on the application with role and an "Invited" badge until they accept). A new invitee's avatar joins the top bar
and the card header. `?role=contributor` shows the application as a Contributor: Next Step on the last tab is disabled with
the tooltip "Only the applicant can submit this application". The Members tab layout is not in Figma, TODO(confirm) (DS-008).

## Responsive
Figma is desktop only (1728). We build 375 / 768 / 1280 ourselves: below 1024 the left panel collapses into a
drawer opened from the top bar, tabs scroll horizontally.
