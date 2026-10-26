---
title: Design system
type: guide
status: draft
last_reviewed: 2026-10-19
source: SMART Figma Audit, 16 Oct 2026 (src/pages/reports/figma-audit.html)
---

# Design system

Shared by all six products. **Source of truth: Figma.** This page summarizes and points to it.
It does not replace Figma.

- **Library:** 🛠 **SMART System**, `figma.com/design/PdvEp0MAIlof6O8MYaXCcy`
- **Which Figma file to use for which screen:** [figma-files.md](figma-files.md)
- **Shared component specs:** [table-filter.md](table-filter.md)
- **Where portals differ today:** [portal-consistency.md](portal-consistency.md)
- **Code implementation:** Tailwind (CDN) + vanilla JS web components in `src/scripts/`. There is no
  separate component package; shared UI lives in files like `nav-component.js`, `topbar-component.js`,
  `table-ui.js`.
- Layout rules per family: [suite/layouts.md](../suite/layouts.md).
- **Design tokens (Tailwind v4.3, Figma ↔ code names):** [tokens.md](tokens.md), code in `src/scripts/design-tokens.js`

## State of the design files (audit, 16 Oct 2026)

Agents need to know this, because Figma is **not** consistent with itself yet:

- **Modules are designed many times over.** Get Paid exists in 23 files, Login/verification in 16,
  Payment Preferences in 13. The copies disagree on fields, labels, steps and states.
  → Always use the **source-of-truth file** in [figma-files.md](figma-files.md), not whichever copy you find first.
- **Newer work hasn't reached the main files.** Bank verification states exist only in
  [REVIEW] Account Validation. The full OTP set exists only in [DEV] SD | Addition of OTP.
- **Status tags are unreliable.** 28 files are tagged [REVIEW], [WIP] or [DEV] but have been untouched
  for 6+ months. Two labeling systems run side by side: stage tags and release numbers (`[R1]`, `[R2]`, `[R3]`).
- **Components are re-created locally.** Many SMART Hub files detach or copy library components.
- **No common desktop frame width** (1440 / 1728 / 1920 / 2699).

## Rules for agents

1. Build from **SMART System** library components. If a Figma screen uses a detached or local copy,
   implement the library component, not the copy.
2. When Figma copies disagree, follow the source-of-truth file. If that file lacks a state you need
   (e.g. verification errors), check the "carry over" files listed in [figma-files.md](figma-files.md),
   and say in your PR which file you used.
3. Use the wording in [suite/glossary.md](../suite/glossary.md#terminology-not-yet-agreed). Where a term
   is still undecided, do not pick one silently; flag it.
4. Light and dark mode on every screen (`PROJECT_RULES.md` §3).

## Planned shared patterns (not done yet)

The audit recommends moving these into SMART System. Until that happens, expect inconsistency here:

- Payment method chooser + bank account details form
- Payment methods list + add bank account modal
- Profile layout shared by vendor, customer and company
- Data table with status badges
- **Table filter**: decided ([table-filter.md](table-filter.md), [decision 0002](../decisions/0002-shared-table-filter.md)): one layout and behavior everywhere, content per portal from column headers
- OTP and verification screen

TODO: owner and timeline for the consolidation.
