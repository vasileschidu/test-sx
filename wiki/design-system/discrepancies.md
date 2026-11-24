---
title: Design discrepancies log
type: guide
status: draft
last_reviewed: 2026-11-19
source: started 2026-11-19 for the design consistency work; rows added by agents from designers' reports (skill log-discrepancy)
---

# Design discrepancies log

One place for every inconsistency people notice by eye: a button that is bigger than its neighbour, a modal header
with different padding, a title in the wrong size. The automatic count of the code is in
[consistency-report.md](consistency-report.md); this log is for what the count can't see, and for decisions.

## How to report one (designers)

Tell the agent in Claude Code, in any words, with a link or a screenshot:

> log discrepancy: the Cancel button on the Add Funds modal is taller than Confirm — https://…figma… (or a screenshot)

The agent (skill `log-discrepancy`) finds the element in code and in Figma, measures both sides, works out the likely
cause and adds a row below. It does **not** fix anything; fixes are planned from this log in batches.
One row per element and place. If the same problem is in many places, it's one row with "many" and an example.

## Columns

- **Where:** product · page or modal · link (local/live page and/or Figma node).
- **Element:** button, heading, modal header, input, card, table, badge, spacing, colour, icon…
- **Expected:** the SMART System component and variant (e.g. `Button/Secondary Size=md`) or the `type-*` role.
- **Actual:** what is there, with numbers (height, padding, font).
- **Side:** code · Figma · both.
- **Cause:**
  - `inline-copy` — markup typed by hand instead of the shared component;
  - `doc-mismatch` — our docs/skills disagree with the SMART System;
  - `old-component` — an outdated Figma component (e.g. "Button (old)");
  - `detached` — a detached / overridden Figma instance;
  - `figma-file` — the product Figma file differs from the library;
  - `no-component` — nothing shared exists yet;
  - `other` (say what).
- **Severity:** high (visible next to the correct one, or on a main flow) · medium · low.
- **Status:** open · decided (target agreed) · fixed (link the PR) · won't fix (say why).

## Log

| ID | Date | Reported by | Where | Element | Expected | Actual | Side | Cause | Severity | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| DS-001 | 2026-11-19 | consistency audit | All products · components skill "Buttons" | Button sizes xs, lg, xl | SMART System: xs 20px `px-1.5 py-0.5 text-xs`, lg 40px `px-3 py-2 text-base`, xl 44px `px-3.5 py-2.5 text-base` | Skill (Tailwind Plus defaults): xs 24px `px-2 py-1 text-xs`, lg 36px `px-3 py-2 text-sm`, xl 40px `px-3.5 py-2.5 text-sm`, so most "xl" buttons in code are 40px with 14px text | code | doc-mismatch | high | open: decide whether code follows the SMART System sizes |
| DS-002 | 2026-11-19 | consistency audit | SMART System library · page Buttons ([12633:517](https://www.figma.com/design/PdvEp0MAIlof6O8MYaXCcy/?node-id=12633-517)) | "Button (old)" component set | Only the 8 current button sets (5 sizes: 20/28/32/40/44px) | "Button (old)" still published, 255 variants, heights 18/20/36/40/48 | Figma | old-component | medium | open: deprecate, then swap its instances |
| DS-003 | 2026-11-19 | Figma consistency audit | SMART Enroll R1 · many screens (e.g. [28619:71177](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28619-71177)) | File upload, buttons | Current SMART System file upload and Button sets | 476 instances of "(old) File Upload" (+26 of its parts) and 30 of "Button (old)" | Figma | old-component | medium | open |
| DS-004 | 2026-11-19 | Figma consistency audit | R3 SMART Exchange · many screens (e.g. [27000:17333](https://www.figma.com/design/9DRzbyv7FDCDYFYN5ZGuwZ/?node-id=27000-17333)) | Modals, card provider, table cells | Instances of the library Modal, Card Provider, Table/Cell/Body | Frames named like the component but not instances: Table/Cell/Body 913, Card Provider 799, Modal 635, Modal/Footer 206 — they don't update with the library | Figma | detached | high | open |
| DS-005 | 2026-11-19 | Figma consistency audit | All product files, most in R3 SMART Exchange (e.g. [27000:17130](https://www.figma.com/design/9DRzbyv7FDCDYFYN5ZGuwZ/?node-id=27000-17130)) | Text and padding inside library components | Component defaults (text style, padding, radius) | Instances with hand-edited font size/weight, padding, spacing or radius: R3 14,186 (font size 8,450), Card Manager 8,235, Hub AP 6,274, Enroll 4,273 | Figma | detached | high | open: check which edits are intended variants (→ add to library) vs drift |
| DS-006 | 2026-11-19 | Figma consistency audit | SMART Disburse Default Flow (e.g. [868:10251](https://www.figma.com/design/4WZgq8XswZFkHcI6bzOIiK/?node-id=868-10251)) | Whole file | SMART System components, colour variables, text styles | Only 37% of instances are SMART System; 3,826 from another library ("General/Button", "Text Field [New]"…); 11,627 colours and 6,658 texts not linked to a style/variable | Figma | figma-file | medium | open: confirm whether Disburse keeps its own library on purpose |
| DS-007 | 2026-11-23 | proto-engineer (TCDM-5241) | SMART Enroll R1 · application shell, main card title ([28471:31816](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28471-31816); local `http://localhost:8899/src/pages/smart-enroll/application.html`) | Heading (tab title "Business Information") | A `type-*` role: nearest is `type-title-section` 20/28 semibold | Figma title text box 32px tall = 24/32 (`text-2xl/8`), a size no `type-*` role covers (Card Manager headers use the same 24px, also off-role). Code ships `type-title-section` (20/28) | both | doc-mismatch | medium | open: decide whether 24/32 becomes a role (e.g. `type-title-header`) or Figma uses Title/Section |
| DS-008 | 2026-11-24 | proto-engineer (TCDM-5250) | SMART Enroll application shell · Invite people (wiki application-shell.md § Invite people; local `http://localhost:8928/src/pages/smart-enroll/application.html`) | User Management "Invite Business Member" modal | Spec says the modal has Invite / Members tabs | The shipped Hub modal has no tabs. Enroll mode adds an Invite / Members tab strip (underline tabs) and a Members list (avatar, name, email, role badge, amber "Invited" badge); Hub mode is unchanged. Layout is invented | both | doc-mismatch | medium | open: TODO(confirm) a Members frame in Figma [R1] jLooCmHwqJcYV5p5d8BHnO |
| DS-008 | 2026-11-24 | proto-engineer (TCDM-5247) | SMART Enroll R1 · Configuration tab card ([28566:45740](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28566-45740); local `http://localhost:8926/src/pages/smart-enroll/application.html?tab=configuration`) | Heading (card title "SMART Exchange Payment Preferences") and missing toggle | `type-title-section` 20/28; the SMART System toggle for the "SMART Exchange … toggle (off by default)" rule | Title drawn ~24/32 (same size as DS-007, off-role). The frame draws no toggle at all (only Save, disabled, and the fields), although the wiki rule says toggle off by default. Code: `type-title-section`, library toggle placed left of Save | both | doc-mismatch | medium | open: draw the toggle in Figma; same 24/32 role decision as DS-007 |
