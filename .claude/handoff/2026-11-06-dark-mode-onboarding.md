# Dark mode for SX enrolment + SMART Disburse (US, UK) — 2026-11-06

Branch: `dark-mode-onboarding`. User decision: dark mode for the whole product line, SX **and** Disburse.
Figma SMART System primitives now = Tailwind v3 hex (same as `tailwind-theme.js`); `semantic colors`
Light/Dark = `src/scripts/design-tokens.js` 1:1. Switch: dashboard user menu "Dark mode" (PR #15), stored in
`localStorage.theme`.

## Rules for every batch
- **Light mode must not change.** `node tools/ui-qa/pixel-compare.mjs --capture before …` before editing,
  `--capture after`, `--compare before,after` → identical, or every diff explained.
- Prefer semantic classes (`text-secondary`, `bg-default`, `border-default`, …) only where the light value is
  identical (text-default = gray-950, secondary = gray-700, tertiary = gray-500; bg-default = white,
  bg-secondary = gray-100, bg-tertiary = gray-50; border-default = gray-200). Otherwise keep the Tailwind
  class and add its `dark:` pair, following the dashboard pairs (white→gray-900 surfaces, gray-50→white/5,
  gray-200 borders→white/10, gray-900 text→white, gray-700→gray-300, gray-500→gray-400, blue-600→blue-400 text).
- Raw hex (`text-[#374151]`, `bg-[#f9fafb]`) → the matching Tailwind v3 class (palette in
  `tailwind-theme.js`) + `dark:` pair. Brand gradients / illustrations / card art: keep, give a dark-friendly
  surround only if they look broken.
- Bump `?v=` on every changed script a page loads with one. No `design-tokens.js` hand edits.
- Report ≤ 15 lines: files, counts, pixel-compare result, anything left.

## Batches
1. **Shared layer** — every page in `src/pages/sx-enroll/`, `src/pages/onboarding/`, `src/pages/sd-uk/`:
   `@custom-variant dark (&:where(.dark, .dark *));` (as on `dashboard/supplier-portal.html` line 34) +
   `theme-init.js` early in `<head>`; `theme-init.js` also honours `?theme=dark|light` (saves it) for testing.
   Then the shared scripts/styles: `onboarding-*.js`, `review-documents.js`, `virtual-card*.js`,
   `debit-card.js`, `paywall.js`, `src/styles/onboarding-checkbox.css`, `checkbox.css` (≈ 350 hex, 200 classes).
2. **SX enrolment** — `src/pages/sx-enroll/*.html`, `src/scripts/sx-enroll*.js` (≈ 460 classes, 67 dark: already).
3. **SD US** — `src/pages/onboarding/*.html` (≈ 170 hex, 540 classes).
4. **SD UK** — `src/pages/sd-uk/*.html`, `sd-uk-flow.js`, `sd-uk.css` (≈ 36 hex, 650 classes).
Batches 2–4 run in parallel after 1 (disjoint files). Then `npm run qa:code -- --dark` on samples, merge.

## Status
- [ ] 1 shared layer  - [ ] 2 SX  - [ ] 3 SD US  - [ ] 4 SD UK  - [ ] QA + PR
