# Changelog

## 2026-03-02 Refactor (maintainability + inline JS extraction)

### What changed

- Extracted all dashboard inline JavaScript blocks into dedicated files:
  - `src/scripts/theme-init.js`
  - `src/scripts/pages/payment-preferences-page.js`
  - `src/scripts/pages/my-company-profile-page.js`
- Updated dashboard HTML pages to reference external scripts instead of inline `<script>` blocks:
  - `src/pages/dashboard/smart-exchange.html`
  - `src/pages/dashboard/payment-preferences.html`
  - `src/pages/dashboard/my-company-profile.html`
- Removed stale date-mask references in `src/scripts/exchanges-table.js` that were no longer present in DOM.
- Updated `README.md` with current structure, data flow, key modules, conventions, and common extension tasks.

### Intentionally not changed

- No visual redesign.
- No Tailwind utility class overhaul.
- No external dependency additions.
- No broad rewrite of legacy scripts into full ES module architecture (deferred to future incremental refactor).
