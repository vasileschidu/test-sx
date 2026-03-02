# SMART Exchange Prototype

SMART Exchange is a static, multi-page dashboard/onboarding prototype built with HTML, Tailwind CSS (CDN mode), and vanilla JavaScript. Data is loaded from local JSON files in `src/data` and rendered client-side.

This repo is intentionally framework-free. The goal is predictable UI behavior and easy iteration on product flows (Payments, Preferences, Company Profile, onboarding).

## Run Locally

1. Start a local server from repo root:

```bash
python3 -m http.server 8080
```

2. Open:

- `http://localhost:8080/`
- `http://localhost:8080/src/pages/dashboard/smart-exchange.html`

No build step is required.

## Folder Structure

```text
.
├── index.html
├── README.md
├── CHANGELOG.md
├── assets/
│   ├── icons/
│   └── img/
├── src/
│   ├── data/
│   │   ├── exchanges.json
│   │   ├── customers.json
│   │   ├── bank-accounts.json
│   │   ├── check-addresses.json
│   │   ├── payment-preferences-data.json
│   │   └── nav.json
│   ├── pages/
│   │   ├── onboarding/
│   │   └── dashboard/
│   │       ├── smart-exchange.html
│   │       ├── payment-preferences.html
│   │       └── my-company-profile.html
│   ├── scripts/
│   │   ├── theme-init.js
│   │   ├── shared.js
│   │   ├── nav-component.js
│   │   ├── sidebar.js
│   │   ├── topbar-component.js
│   │   ├── exchanges-table.js
│   │   ├── payment-preferences-components.js
│   │   ├── payment-preferences-tabs.js
│   │   ├── confirm-identity.js
│   │   ├── confirm-business-details.js
│   │   ├── review-documents.js
│   │   ├── signature.js
│   │   └── pages/
│   │       ├── payment-preferences-page.js
│   │       └── my-company-profile-page.js
│   └── styles/
│       └── global.css
└── package.json
```

## Data Flow

Primary flow:

1. JSON data is loaded from `src/data/*.json`.
2. Scripts normalize/derive view models where needed (for example payment-method details and filter options).
3. UI rendering functions update table rows/cards/tabs from normalized state.
4. User interactions update in-memory state and trigger re-render.

Single source of truth is the JSON + in-memory state objects in page scripts. UI should not hardcode values already represented in JSON.

## Key Modules

- `src/scripts/theme-init.js`
  - Early theme bootstrap (reads `localStorage.theme`, sets `.dark` on `<html>` before paint).
- `src/scripts/shared.js`
  - Common helpers: theme toggle wiring, breadcrumbs, copy-to-clipboard behavior, utility helpers.
- `src/scripts/nav-component.js`
  - Sidebar web component markup and nav rendering.
- `src/scripts/sidebar.js`
  - Sidebar collapse/expand behavior and shared table row expand logic.
- `src/scripts/topbar-component.js`
  - Top header web component and page title mapping.
- `src/scripts/exchanges-table.js`
  - Payments table logic: filtering, sorting, row details, dialogs, and date interval behavior.
- `src/scripts/payment-preferences-components.js`
  - Payment preferences card/detail rendering helpers.
- `src/scripts/payment-preferences-tabs.js`
  - Payment preferences tab switching logic.
- `src/scripts/pages/payment-preferences-page.js`
  - Page-specific behavior extracted from inline script.
- `src/scripts/pages/my-company-profile-page.js`
  - Page-specific business/contact edit flows extracted from inline script.

## Conventions

- JavaScript naming: `camelCase` functions/vars.
- File naming: `kebab-case.js`.
- HTML contains no inline JavaScript blocks.
- Keep dark mode support when adding classes (`dark:*` pairings for text/background/border).
- Prefer reading from JSON files instead of hardcoding repeated values.

## Common Tasks

### Add a new nav item

1. Add item in `src/data/nav.json` (source of truth).
2. Mirror/update nav config in `src/scripts/nav-component.js`.
3. If needed, map active state in `APP_NAV_PAGE_MAP`.

### Add a new JSON field

1. Add field to relevant JSON file in `src/data`.
2. Update normalization/mapping logic in the page script that consumes it.
3. Render the field in the relevant component/template.
4. Add safe fallback (`'—'`) for missing values.

### Add a new table column (Payments)

1. Update header/row markup in `src/pages/dashboard/smart-exchange.html`.
2. Update row rendering and sort/filter mapping in `src/scripts/exchanges-table.js`.
3. Ensure dark mode and responsive behavior match existing columns.

## Known Limitations / TODO

- Scripts are still mostly side-effect based and globally initialized; they are not fully migrated to ES module imports/exports yet.
- Some page scripts are large and should be split into smaller feature modules in a future pass.
- Tailwind is currently CDN/browser mode; no production CSS build pipeline is configured.
