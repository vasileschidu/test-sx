# proto-engineer — playbook core

Read fully before every job. Keep under ~12k tokens; detail goes to `proto-engineer-lessons.md` (grep only).

## Codebase map
- `index.html` — entry page. `src/pages/dashboard/*` — portals (Supplier Portal / SMART Exchange,
  SMART Hub AP/AR, Consumer Portal `consumer-*`, Vendors, Payment Preferences, Payment Programs).
  `src/pages/onboarding/*` — SMART Disburse token flow (US default + `?flow=multi-party`).
  `src/pages/sd-uk/*` — UK claim demo (hidden from menus). `src/pages/wiki/` — wiki viewer for `wiki/*.md`.
- Shell: `nav-component.js` (`<app-nav>`), `topbar-component.js` (`<app-topbar>`), `sidebar*.js`,
  `shared.js` (tooltips, focus, cursor), `theme-init.js` (dark mode), `app-plans.js` / `app-switch.js`.
- Tables: `exchanges-table.js` (supplier, 10k lines), `consumer-exchanges-table.js` (8k),
  `bills-payables-table.js`, `table-ui.js`, `table-skeleton.js`; filter spec `wiki/design-system/table-filter.md`.
- Payment preferences: `pages/payment-preferences-page.js`, `payment-preferences-components.js`, `-tabs.js`, `stp-state.js`.
- SD flow: `onboarding-*.js`, `sd-onboarding-context.js` (token data), `onboarding-transitions.js`.
- Data: `src/data/*.json` via `DataSource.load()` only.
- Tokens: `tailwind-theme.js` (v3 palette) → `design-tokens.js` (generated; semantic + `type-*`).

## Workflow
1. Read the request; list what changes and which pages show it.
2. Grep for the existing implementation + the inventory snippet. Reuse; extend; build new last.
3. Change the smallest surface. Match surrounding formatting (Vlad's files are Prettier defaults).
4. `node --check` changed JS; bump `?v=` where pages pin one; serve with `tools/serve.py`.
5. QA (`code-audit`, `hover-audit`, `pixel-compare` for refactors), fix majors, re-run.
6. Lessons → `proto-engineer-lessons.md`; report with local links.

## Rules
- Tailwind only; semantic classes + `type-*` in new/touched UI; no raw hex, no inline style.
- Every interactive element: visible hover, `focus-visible` ring, disabled state; dark pair on dashboard pages.
- Text that can be cut gets `truncate` + a tooltip (`data-tooltip` or `title`).
- Last row in a card/list has no bottom divider. Labels `font-medium`, never semibold.
- Script order in `<head>`: Tailwind CDN → `tailwind-theme.js` → `design-tokens.js` → page scripts.
- Never edit `design-tokens.js` by hand; never push to `main`.

## Gotchas
- Tailwind's browser build generates CSS **after** load and after DOM changes: wait ~800 ms before
  measuring computed styles; classes added later still work.
- `python3 -m http.server` lets browsers cache scripts → old JS runs after a branch switch. Use `tools/serve.py`.
- `sessionStorage` is per tab: SD flow state only survives navigation in the same tab (tests too).
- Merges: most conflicts are one `<script>` line in every page `<head>` — resolve once with a script.
- Giant table scripts: `grep -n "function <name>"` then read that range only.
