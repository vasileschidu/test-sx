---
title: SMART Enroll — overview
type: product-overview
status: draft
last_reviewed: 2026-11-26
product: smart-enroll
layout_family: Enroll
current_version: "R1"
---

# SMART Enroll

## Purpose
Enrollment portal through which users get access to SMART Hub.

## Primary users
The **applicant** of a business that wants SMART Hub (e.g. its CFO). From the R1 Figma file; TODO(confirm) with product.

## Layout family
**Enroll**. See [suite/layouts.md](../../suite/layouts.md).

## Interacts with
- **Hub**: completing enrollment grants Hub access (I-01)

Full details: [suite/integrations.md](../../suite/integrations.md).

## Pages in this folder
- [standard.md](standard.md): what the current standard version does (index of the area pages in `flows/`)
- [changelog.md](changelog.md): history of standard versions
- [variants/](variants/README.md): client-specific deltas

## Figma sources: which file wins (agreed 2026-11-26)
- **Content and function → R1** [SMART Enroll R1](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll):
  fields, labels, copy, sections, flows, statuses, which buttons exist.
- **States and interactions → SE (In Progress)** [SE file](https://www.figma.com/design/JXlBv04yGfuOpi0BnNtq7H/):
  default / hover / pressed / focus / disabled / selected / error / loading, and what an action triggers
  (e.g. "Add" opens a modal). Element states: Master Components `4349:433623`. Inventory: [se-states.md](se-states.md).
- On conflict: content follows R1, behaviour follows SE; log a DS row in
  [discrepancies.md](../../design-system/discrepancies.md).
- Scope: what exists only in SE (Compliance, Goldman Sachs, QuickBooks/Acumatica token and profile states,
  QB ERP Connector page) is **not** in R1.
- Decisions 2026-11-26 (gap lists in [gaps/](gaps/)):
  Business Plan creation wizard (SE only) is **out** of R1, "Get Started Now" stays "Coming soon";
  logo/icon upload **keeps the File Upload dropzone** (DS-012) instead of the Figma square placeholder;
  Configuration follows Figma (no toggle, Save disabled until a change); ERP connect keeps the R1 3-step flow
  with SE's Failed connection / Disconnect / Please wait dialogs added.

## What the R1 Figma file shows (read 2026-11-11, not yet built in code)
Source: [R1] SMART Enroll `jLooCmHwqJcYV5p5d8BHnO`. Desktop frames only (1728 wide); no mobile/tablet.
"SE" in other files (e.g. User Management "Invite user (SE)") means **SMART Enroll**, not SMART Exchange.

- **Products:** AP/AR Payments is the base (always on); add-ons Merchant Services and Cross-Border Payments
  (Supply Chain Financing only appears in the menu).
- **Flows:**
  - Speedy Sign up (3 steps: business details → pick the matching business → applicant).
  - Sign in / up (email → 6-digit code → Microsoft account → Select Platform: SMART Enroll vs SMART Hub → business switcher).
  - Application tabs: Business Information → Ownership → Connectors → Configuration
    (+ Financial / Business Plan with Merchant Services, + Transactional with Cross-Border).
  - Submission: a 4-step Submit modal (add-on offer, review, attestation, submit) + authorized signer flow.
  - Errors: required-field states per tab.
- **Shell:** top bar (SMART Hub logo, "Invite people" link, avatars, business switcher, "Next Step");
  left panel "Application Progress" (% + bar), status box (Pending enrollment data, Pending Approval, Approved,
  Declined, Suspended), "What are you looking to do?" product list, "Help from Transcard"; main card with tabs.
  Menu anatomy frame `28107:8955`; standard shell frames `28471:37074` (Business Information), `28511:32098` (Connectors).
- **Invite people:** only a link in this file. The "Invite People" modal (Invite / Members tabs) is drawn in the
  User Management file (`qiy6GvUHQMhdbC7hkXCCyb`, sections `460:37037` / `460:37645`) over an "Onboarding information"
  screen. TODO(confirm): is that screen the Business Information tab?
- The status pages (In Development, For Review) are empty; Drafts holds older work.

The open questions from the 2026-11-17 audit are answered as decisions D-1…D-14 in [standard.md](standard.md#decisions-r1)
(Invite reuses the User Management modal, invitee = Contributor; Supply Chain Financing = "Coming soon"; tablet/mobile derived by us).

## Code
- Path in repo: `src/pages/smart-enroll/` (new, own shell). Not `src/pages/sx-onboarding/` (SMART Exchange supplier enrollment)
  and not `src/pages/onboarding/` (SMART Disburse).
- Figma (current): [R1] SMART Enroll [Figma](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll).
  Older concept: [REVIEW] Concept Enroll in Hub [Figma](https://www.figma.com/design/NrJlWBQph0rLI4yKzgktK2).
- Module-level source-of-truth files: [design-system/figma-files.md](../../design-system/figma-files.md)
