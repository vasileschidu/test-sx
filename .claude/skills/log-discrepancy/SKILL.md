---
name: log-discrepancy
description: Log a design inconsistency a designer or anyone reports (button size, header padding, font size, spacing, colour… that differs between screens or from the SMART System) as a row in wiki/design-system/discrepancies.md, after measuring it in code and Figma and naming the likely cause. Use when someone says "log discrepancy", "log this inconsistency", "add to discrepancies", or reports such a mismatch with a link or screenshot. Records only; never fixes.
---
# Log a design discrepancy

File: `wiki/design-system/discrepancies.md` (columns, cause and severity values are defined at its top).
Automatic counts: `npm run qa:consistency` (report: `wiki/design-system/consistency-report.md`).

## Steps
1. **Understand the report.** What element, where, compared with what. If the place or the element is unclear, ask one
   short question; don't guess.
2. **Find it in code.** Grep the page/script for the visible text; note `file:line` and the classes. If the page needs
   demo state, use the `sandbox-render` skill and measure the element box (height, padding, font size).
3. **Find the target.** SMART System (`PdvEp0MAIlof6O8MYaXCcy`, figma-b) component + variant, or the `type-*` role in the
   design-system skill, or the markup in the components skill. If the report links a product Figma file, read that node
   (one `get_screenshot` / small `use_figma` read; keep Figma calls few, see the usage-budget skill).
4. **Name the cause** from the list in the file (`inline-copy`, `doc-mismatch`, `old-component`, `detached`,
   `figma-file`, `no-component`, `other`). Check whether `consistency-report.md` already shows the same variant in many
   files; if so write "many (N uses)" and one example.
5. **Check for a duplicate row** (same element and cause). Update that row instead of adding one.
6. **Append the row** with the next `DS-NNN` id, today's date, the reporter's name or role, numbers on both sides,
   and links (local page `http://localhost:8899/…`, live `https://vasileschidu.github.io/test-sx/…`, Figma node).
   Status `open`.
7. **Don't fix it.** Report back in 2–3 lines: the row id, the cause, and whether it's part of a bigger pattern.
   Commit only when asked, on a branch (never `main`), and mention the row ids in the commit message.

## Rules
- No client names (use client codes). Sample people/business names from Figma are demo data, don't copy them.
- Numbers, not adjectives: "40px tall, 14px text" not "too big".
- One row per element and place; a repeated pattern is one row with a count.
