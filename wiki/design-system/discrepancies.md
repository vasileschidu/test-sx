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
