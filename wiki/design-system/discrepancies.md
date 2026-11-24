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
| DS-008 | 2026-11-24 | proto-engineer (TCDM-5244) | SMART Enroll R1 · Business Information, Business Icon / Logo ([28471:37074](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28471-37074); local `http://localhost:8899/src/pages/smart-enroll/application.html?tab=business-information`) | File upload | SMART System File Upload (`9431:16522`) | Local "SE/Info Tabs/Business Information/Logo Upload": image placeholder + xs "Upload" / "Remove" / "Change" buttons, not the library upload. Code ships the T1 File Upload (one file, pencil = Upload another) | Figma | old-component | medium | open: Figma to swap in File Upload or add an image-preview variant to the library |
| DS-009 | 2026-11-24 | proto-engineer (TCDM-5244) | SMART Enroll R1 · Business Information, DBA question ([28570:56408](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28570-56408)) | YES / NO choice | A library component (none exists) | Local "SE/Info Tabs/Business Information/Questions" draws two small bordered buttons, selected = blue tint. Code: radio group styled as Secondary md (`has-checked:` blue-50 / blue-700 / ring blue-300), added to the components skill | Figma | missing-component | low | open: add a Yes/No (segmented) component to SMART System |
| DS-010 | 2026-11-24 | proto-engineer (TCDM-5244) | SMART Enroll R1 · Business Information errors ([28632:81938](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28632-81938)) | Labels, error copy, banner | One consistent frame set | Errors frame marks Main Business Phone / Email / Website "Optional" yet shows " is required." with no field name; DBA upload titled "Attach the Attach the Organization Document"; "Fictitous" typo; "Top helper" placeholder labels; banner sits in the 3rd column in the initial frame but full width here. Code: fields required (wiki), "<Field> is required.", "Fictitious / DBA business name statement", banner full width | Figma | copy | medium | open |
| DS-011 | 2026-11-24 | proto-engineer (TCDM-5244) | SMART Enroll R1 · Business Information ([28471:37074](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/?node-id=28471-37074)) | Select chevron, URL add-on, banner X | Components skill: select trigger chevron-up-down, inline add-on input, the one dismiss X | Figma draws a chevron-down on selects, "http://" as a boxed add-on with a divider and a blue X on the "Not your business?" banner. Code keeps the inventory markup (up-down chevron, inline `http://`, gray dismiss X per CLAUDE.md rule 8) | Figma | detached | low | open |
