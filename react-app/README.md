# React Migration Preview

This folder contains the parallel React version of the project. The original static HTML/JS app remains unchanged in the root `src/` tree.

## Current parity strategy

The current pass is intentionally parity-first.

The route bodies are still being migrated page by page, but the active React product routes now sit inside a real React-owned Catalyst shell instead of the old static custom-element shell bridge.

Supported hash routes:

- `#/payables` (real React route)
- `#/payment-preferences` (real React route)
- `#/vendors` (real React route)
- `#/vendors/:id` (real React route)
- `#/smart-exchange`

## Source-of-truth data

The React app reads from the existing project data files outside this folder:

- `../src/data/bills-payables.json`
- `../src/data/payees.json`
- `../src/data/vendor-profiles.json`

Those same files are still the source of truth because the parity bridge is rendering the existing pages directly.

## Run locally

```bash
cd react-app
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Current architecture

- `src/App.jsx` now mixes real React routes with legacy parity routes
- `src/components/AppShell.jsx` is the active React-owned shell for migrated product routes
- `src/components/sidebar-layout.jsx`, `src/components/sidebar.jsx`, `src/components/navbar.jsx`, and `src/components/avatar.jsx` provide the Catalyst shell primitives used by the app shell
- `src/components/ProductPageFrame.jsx` provides the route content frame inside the Catalyst shell
- `#/payables`, `#/vendors`, `#/vendors/:id`, and `#/payment-preferences` now render from React feature code
- the remaining product routes still come from the original `src/pages/dashboard/*.html` pages
- `src/components/catalyst/` contains the safe raw Catalyst primitives copied into the app
- `src/components/app/` contains product-specific wrappers built for this project
- `src/styles/tailwind.css` enables Tailwind CSS v4 for future React page work

## Catalyst strategy

Catalyst is now used for the React-owned shell and as a primitive layer, but it is still not the design source of truth for route bodies.

Use Catalyst directly for low-risk primitives:

- button internals
- input/select/textarea internals
- checkbox/switch
- dialog
- dropdown
- fieldset
- description list
- text/heading/divider

Do not use raw Catalyst components as direct product UI for:

- tables
- pagination
- route body layouts

The current dashboard remains the visual reference. If a raw Catalyst component drifts from the current app, wrap it or keep the current markup.

## Initial app wrappers

These wrappers are in place now:

- `src/components/app/Button.jsx`
- `src/components/app/Input.jsx`
- `src/components/app/Modal.jsx`
- `src/components/app/DescriptionList.jsx`

They are intended as the start of the app-level component layer that preserves the project’s UI language.

## Notes

- This is still a hybrid app, not the final React migration.
- The real non-iframe product routes are now Payables, Vendors, and Payment Preferences.
- Vendors and Vendor Profile were corrected back toward static markup/layout parity in this pass.
- Migrated React product routes now render inside the Catalyst `AppShell`.
- `StaticDashboardShell.jsx` remains only as a legacy bridge/reference and is no longer the primary shell path.
- The next recommended route to migrate is `SMART Exchange`, or the pay flow if that is the higher product priority.
