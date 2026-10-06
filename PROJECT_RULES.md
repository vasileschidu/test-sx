# PROJECT_RULES.md
## SMART Exchange Dashboard — Architectural Rules

All contributors and AI agents MUST follow these rules. Every change must respect and reinforce them.
If a rule conflicts with existing code, **refactor the code to match the rule**.

---

## 1. Navigation — Single Source of Truth

- **No duplicated navigation markup across pages.**
- The dashboard sidebar (mobile + desktop) is rendered exclusively by the `<app-nav>` web component defined in `src/scripts/nav-component.js`.
- Navigation data lives in `src/data/nav.json`. The component imports an inline copy of this data (since no build step exists); keep both in sync.
- Active-link detection is automatic via `window.location.pathname` — never hardcode active states in HTML.
- All nav pages and sub-pages must be registered in both `nav.json` and the component's page-id map.
- Onboarding pages have their own static stepper sidebar and are **exempt** from `<app-nav>`.

### Adding a new dashboard page:
1. Add an entry to `src/data/nav.json`.
2. Update the `APP_NAV_DATA` constant in `src/scripts/nav-component.js` to match.
3. Add its filename → nav-id mapping to `_getActiveId()` in the component.
4. Use `<app-nav></app-nav>` in the page's `<body>`.

---

## 2. Data — Single Source of Truth

- **No hardcoded business or configuration data in HTML files.**
- Every repeatable dataset belongs in `src/data/` as a structured JSON file.
- One JSON file per domain:
  - `exchanges.json` — payment table config + transaction records
  - `bank-accounts.json` — bank account list
  - `check-addresses.json` — mailing addresses for checks
  - `customers.json` — vendor/customer master list
  - `nav.json` — navigation structure
- JSON keys must be **camelCase**, values must use **correct types** (number, boolean, string — not stringified booleans).
- Remove fields that are no longer rendered or referenced.
- The UI must render from these JSON files; never duplicate data between JSON and HTML.

### validateData() requirement:
Each data-loading module must call a lightweight `validateData(data, requiredFields)` function before rendering. Fail gracefully (show an error state in the UI, log to console) if data is missing or malformed.

---

## 3. Dark Mode

- All Tailwind `dark:` variants must be present wherever a light-mode color is set.
- The anti-flash script in `<head>` is the **only permitted inline script** (it must run synchronously before first paint).
- The dark mode `@custom-variant dark (&:where(.dark, .dark *))` declaration in `<style type="text/tailwindcss">` is required in every page.
- The theme toggle handler lives in `src/scripts/shared.js` — do not duplicate it.
- Never mix CSS custom properties and Tailwind classes for the same color concern.

---

## 4. Responsive Design

- Mobile-first: start with the smallest viewport, use `sm:`, `md:`, `lg:` breakpoints to enhance upward.
- The sidebar is always off-canvas (`<el-dialog>`) on mobile and fixed-rail on `lg+`.
- Main content uses `id="main-content-wrapper"` with `lg:pl-[360px]` (expanded) / `lg:pl-[88px]` (collapsed) — these classes are toggled by `sidebar.js`.
- No `overflow-x` breakage on any viewport. Test at 320px, 768px, 1280px, 1440px.

---

## 5. JavaScript Architecture

- **No inline `<script>` blocks in HTML files** (the anti-flash dark mode script in `<head>` is the sole exception).
- **No inline `onclick=` attributes.** Attach event listeners via `addEventListener` in external scripts.
- File responsibilities:
  | File | Responsibility |
  |------|----------------|
  | `src/scripts/nav-component.js` | `<app-nav>` web component — renders sidebar, handles submenu toggle events |
  | `src/scripts/sidebar.js` | Desktop sidebar collapse/expand, tooltips, active-item highlight |
  | `src/scripts/shared.js` | Theme toggle, breadcrumbs, copy-to-clipboard, masked-text detection |
  | `src/scripts/exchanges-table.js` | Table rendering, pagination, sorting, Get Paid panel |
  | `src/scripts/payment-preferences-tabs.js` | Tab routing for Payment Preferences page |
  | `src/scripts/payment-preferences-components.js` | Row builders for bank accounts and check addresses |
  | `src/scripts/confirm-identity.js` | Onboarding Step 1 logic |
  | `src/scripts/confirm-business-details.js` | Onboarding Step 2 logic |
  | `src/scripts/review-documents.js` | Onboarding Step 3 logic |
  | `src/scripts/signature.js` | Onboarding Step 4 signature canvas |
- No duplicated functions across files.
- No global namespace pollution beyond what is strictly necessary (e.g., `toggleRow`, `toggleExpandableItem`, `toggleSmartExchangeSubmenu` must remain global for sidebar interop).

### Script loading order (dashboard pages):
```html
<!-- 1. nav-component.js must come BEFORE sidebar.js so the nav HTML exists when sidebar.js runs -->
<script src="nav-component.js" defer></script>
<script src="sidebar.js" defer></script>
<script src="shared.js" defer></script>
<!-- page-specific scripts last -->
```

### Known tech debt (inline scripts to extract):
- `payment-preferences.html` contains a large inline script (~2137 lines) with payment-data loading and card-formatting logic. Target: `src/scripts/payment-preferences-init.js`.
- `my-company-profile.html` contains an inline script (~360 lines) for the business-info form editor. Target: `src/scripts/my-company-profile-init.js`.
- These are prioritized in the next refactoring cycle.

---

## 6. Accessibility Baseline

- All interactive elements must be keyboard-navigable (`focus-visible:` classes required).
- Images must have `alt` text.
- Icon-only buttons must have `<span class="sr-only">` labels or `aria-label`.
- Use `aria-current="page"` on active nav links (the nav component handles this automatically).
- Color contrast: minimum 4.5:1 for normal text, 3:1 for large text. Always test both light and dark modes.

---

## 7. Naming Conventions

| Concern | Convention | Example |
|---------|------------|---------|
| HTML files | kebab-case | `smart-exchange.html` |
| JS files | kebab-case | `nav-component.js` |
| JSON files | kebab-case | `bank-accounts.json` |
| CSS classes | Tailwind utility classes only | `flex items-center gap-3` |
| JS functions | camelCase | `initThemeToggle()` |
| JS constants | UPPER_SNAKE for module-level data | `APP_NAV_DATA` |
| Data keys | camelCase | `vendorEntry`, `dateInitiated` |
| DOM IDs | kebab-case | `desktop-sidebar-shell` |
| Data attributes | kebab-case | `data-nav="desktop"`, `data-copy-id` |

---

## 8. Folder Structure

```
/
├── PROJECT_RULES.md          ← This file
├── index.html                ← GitHub Pages entry
├── assets/
│   └── img/                  ← Logo SVGs only
├── src/
│   ├── data/                 ← JSON data sources (single source of truth)
│   │   ├── nav.json
│   │   ├── exchanges.json
│   │   ├── bank-accounts.json
│   │   ├── check-addresses.json
│   │   └── customers.json
│   ├── scripts/              ← All JavaScript (no inline scripts in HTML)
│   │   ├── nav-component.js
│   │   ├── sidebar.js
│   │   ├── shared.js
│   │   ├── exchanges-table.js
│   │   ├── payment-preferences-tabs.js
│   │   ├── payment-preferences-components.js
│   │   ├── confirm-identity.js
│   │   ├── confirm-business-details.js
│   │   ├── review-documents.js
│   │   └── signature.js
│   ├── styles/
│   │   └── global.css        ← Tailwind directives
│   └── pages/
│       ├── dashboard/        ← Dashboard pages (use <app-nav>)
│       └── onboarding/       ← Onboarding flow (standalone nav)
```

---

## 9. Prohibited Patterns

| ❌ Prohibited | ✅ Required instead |
|--------------|-------------------|
| Duplicated sidebar HTML across pages | `<app-nav></app-nav>` |
| `onclick="fn()"` in HTML attributes | `el.addEventListener('click', fn)` |
| `<script>` blocks in `<body>` | External `.js` file with `defer` |
| Hardcoded names/amounts/addresses in HTML | Render from JSON data |
| Mixing `dark:` and non-`dark:` on same element | Always pair them |
| `style="..."` attribute on any element | Tailwind classes only |
| `@apply` in CSS | Tailwind utility classes directly in HTML |
| Separate nav markup per page | Single `<app-nav>` component |
| Copying a function from one JS file to another | Import / shared module |

---

## 10. No Build Step Policy

This project runs directly in the browser using Tailwind CDN (`@tailwindcss/browser@4`).
- No bundlers, transpilers, or build tools.
- No ES module `import/export` syntax (use `const` / global scope with IIFE where needed).
- Web Components use the custom elements v1 API (light DOM, no shadow root) so Tailwind CDN can detect and apply classes via MutationObserver.
- JSON data files are either fetched or referenced as inline constants in JS.
