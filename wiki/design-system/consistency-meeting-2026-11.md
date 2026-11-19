---
title: Design consistency — decisions meeting
type: guide
status: draft
last_reviewed: 2026-11-19
source: code audit (consistency-report.md) and Figma audit (figma-consistency-report.md), 2026-11-19
---

# Design consistency — decisions meeting

## Why we meet

The same button, header or title looks slightly different from screen to screen, in Figma and in code. We audited
both sides. Today we need **six decisions** on what the target is. After that, the fixes can run in batches and a
check can stop new drift.

## What the audits found

**Code (prototype):** 368 buttons come in 95 different class combinations. Only 145 match a SMART System button
size exactly; 108 match none. Headings come in 36 variants, and only 20 use a shared text role. There are 1,566
hard-coded values and 143 hex colours.

**Figma (9 product files):** most components come from the SMART System library, but many are edited by hand or
detached.

| File | From SMART System | Hand-edited instances | Detached copies | Old components |
|---|---|---|---|---|
| R3 SMART Exchange | 86% | 14,186 | 5,735 | 8 |
| Card Manager | 82% | 8,235 | 1,802 | 0 |
| Hub AP (R2) | 92% | 6,274 | 1,249 | 6 |
| SMART Enroll | 67% | 4,273 | 777 | 532 |
| Consumer Portal | 82% | 1,772 | 476 | 0 |
| Disburse Default Flow | 37% | 1,774 | 138 | 0 |
| Hub AR | 69% | 301 | 72 | 0 |
| User Management | 69% | 255 | 212 | 0 |
| Vendor Profile | 99% | 35 | 38 | 0 |

Vendor Profile shows what a clean file looks like. Counts are a little inflated by scaled-down preview frames, so
read them as a trend.

## Root causes

The drift has four causes: two in code and two in Figma.

1. **Our code docs disagree with the SMART System.** The components guide lists default Tailwind button sizes. For
   example, it gives xl as 40px with 14px text, but the SMART System says 44px with 16px text. (DS-001)
2. **Code markup is copied by hand.** Buttons and headers are typed again in each page (65 files) instead of using
   one shared class, so each copy drifts.
3. **Figma instances are edited or detached.** Font size, padding and radius are changed on the spot. Detached
   copies don't update when the library changes. (DS-004, DS-005)
4. **Old or other libraries are still in use.** "Button (old)" is still published, Enroll uses 476 "(old) File
   Upload", and Disburse mostly uses another library. (DS-002, DS-003, DS-006)

## Decisions needed

Each row has a recommendation. Fill in Decision in the meeting: agreed, changed (write the new target), or later.

| # | Question | Recommendation | Decision |
|---|---|---|---|
| 1 | Which button sizes are the standard? | The SMART System sizes, in code too: xs 20, sm 28, md 32, lg 40, xl 44px; lg and xl use 16px text. Some code buttons get 4px taller. | |
| 2 | Which heading styles are allowed? | Only the SMART System text styles, mapped to the shared text roles in code. No custom sizes. | |
| 3 | May designers change font, padding or radius on a library instance? | No. If a screen needs a new look, add a variant to the library. | |
| 4 | What do we do with "Button (old)" and "(old) File Upload"? | Mark them deprecated now. Swap Enroll's 532 instances, then unpublish the old ones. | |
| 5 | Which R3 detached copies do we re-link first? | Modals (635), then Card Provider (799), then table cells (913). | |
| 6 | Does Disburse keep its own library? | Ask the Disburse team. If not on purpose, move it to the SMART System in stages. | |

## What happens after

1. **Shared classes in code:** one class per button size and heading role, built from the agreed targets.
2. **Migration in code:** pages move to the shared classes in batches; each batch is checked before/after with a
   pixel comparison, so only the agreed changes show.
3. **Check on every pull request:** `npm run qa:consistency` must not show more off-standard buttons or headings
   than before.
4. **Figma cleanup:** deprecate old components, re-link detached copies, reset hand edits, file by file (R3 first).

**Reporting new discrepancies:** tell the agent "log discrepancy: …" with a Figma link or screenshot. It measures
both sides and adds a row to [discrepancies.md](discrepancies.md). It never fixes anything on its own.

## Links

- [Code consistency report](consistency-report.md)
- [Figma consistency report](figma-consistency-report.md)
- [Discrepancies log](discrepancies.md) (DS-001 to DS-006)
- [SMART System library — buttons](https://www.figma.com/design/PdvEp0MAIlof6O8MYaXCcy/?node-id=12633-517)
