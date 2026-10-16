# test-sx — Codebase Audit

**Scope:** read-only assessment of the static prototype at `/Users/user/Desktop/test-sx`.
**Purpose:** handoff document. The next agent restructures a **sandbox copy**, never the original.
**Method:** every number below was measured from the working tree, not estimated. Commands used are
noted where the figure is non-obvious.

Counts exclude `node_modules/`, `.git/`, `.history/`, `.lh/`, `dist/`, `.next/`, `tmp-icons/`, and
the vendored `react-app/catalyst-ui-kit 3/`.

---

## 1. STRUCTURE

### 1.1 Top-level tree

```
test-sx/
├── index.html                  Launcher page. 3 links: onboarding ×2, dashboard ×1.
├── package.json                Only dependency: flag-icons ^7.5.0. No build scripts.
├── tailwind.config.js          DEAD — v3-shaped config; the app loads Tailwind v4 via CDN.
├── PROJECT_RULES.md            Written conventions. Several are violated (§5).
├── README.md                   Setup + token-flow docs. Stale (3 refs to renamed page).
├── CHANGELOG.md
├── assets/                     Brand SVGs (smart-hub logos ×7, 5 nav icons).
├── docs/                       One file: github-pages-sd-sx-token-testing.md
├── src/                        THE PROTOTYPE — all production HTML/JS/data.
├── react-app/                  Parallel React/Vite implementation (§2.5). Not linked from src/.
├── workers/                    Cloudflare Worker: sd-sx-token-service (email token API + KV).
├── .history/ .lh/              Editor local-history noise. ~459 files. Not source.
└── tmp-icons/                  Scratch icon dumps. Not referenced.
```

### 1.2 `src/` — the actual application

```
src/
├── data/          13 JSON datasets + README.md
├── pages/
│   ├── dashboard/ 8 pages   (the authenticated product)
│   ├── onboarding/ 13 pages (the supplier onboarding flow) + sample-lorem.pdf
│   └── tools/     1 page    (sd-sx-token-test.html — internal test harness)
├── scripts/       29 top-level .js + scripts/pages/ (3 .js)
├── styles/        global.css — DEAD, referenced by nothing (§4.1)
└── assets/        12 illustration SVGs
```

**Dashboard pages** (`src/pages/dashboard/`):

| File                       | Lines | Role                                                   |
| -------------------------- | ----: | ------------------------------------------------------ |
| `payables-pay.html`        |  2447 | Pay-a-payable flow                                     |
| `payment-preferences.html` |  2404 | Payment method management                              |
| `supplier-portal.html`     |  1986 | Main exchange table (renamed from smart-exchange.html) |
| `my-company-profile.html`  |   486 | Company profile editor                                 |
| `bills-and-payables.html`  |   420 | Payables table                                         |
| `ap-ar-payments.html`      |   161 | AP/AR upgrade page                                     |
| `vendors.html`             |   155 | Vendor list                                            |
| `vendor-profile.html`      |    92 | Vendor detail                                          |

**Onboarding pages** (`src/pages/onboarding/`): `index`, `confirm-identity`,
`confirm-business-details`, `review-documents`, `signature`, `paywall`, `instant-virtual-card`,
`debit-card-details`, `debit-account-info`, `summary`, `create-account`, `complete` (774 lines,
largest). One flow; a previously separate `onboarding-sd/` was merged in.

**Scripts by size** — `src/scripts/`, 28,122 lines total:

| File                                | Lines |
| ----------------------------------- | ----: |
| `exchanges-table.js`                |  7260 |
| `payables-pay.js`                   |  5404 |
| `pages/payment-preferences-page.js` |  3059 |
| `bills-payables-table.js`           |  3056 |
| `shared.js`                         |  1153 |
| `vendors-page.js`                   |   863 |
| `vendor-profile-page.js`            |   721 |
| `stp-state.js`                      |   697 |
| `topbar-component.js`               |   625 |
| `nav-component.js`                  |   619 |
| `sidebar.js`                        |   550 |
| `pages/my-company-profile-page.js`  |   462 |
| `onboarding-transitions.js`         |   410 |
| …19 more under 400 lines each       |       |

The top four files are **59% of all JavaScript** (18,779 / 28,122 lines).

### 1.3 Entry points and serving

- **Serving:** `python3 -m http.server 8080` from the repo root (README §"Run Locally"). No dev
  server, no HMR, no build step. Files are served exactly as authored.
- **Entry:** `index.html` at the root — a launcher with three `<a>` links. There is no router;
  every page is a separate full HTML document reached by URL.
- **Production:** GitHub Pages (static) + one Cloudflare Worker at
  `workers/sd-sx-token-service/` (609 lines) with a KV binding `TOKEN_STORE`, deployed via
  wrangler. This is the only server-side code.
- **README is stale:** it still tells you to open `smart-exchange.html`, which no longer exists
  (3 occurrences).

### 1.4 Detected stack

| Concern         | Reality                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework       | **None.** Vanilla JS. One Web Component (`<app-nav>`), one more (`<app-topbar>`).                             |
| Module system   | **None.** No `import`/`export` anywhere in `src/scripts/`. 26 of 29 files are IIFEs; 3 are not (§3.3).        |
| Build tool      | **None** for `src/`. `react-app/` has Vite, but is not part of the served site.                               |
| CSS             | **Tailwind v4 via CDN** (`@tailwindcss/browser@4`), loaded in all 22 pages. Utility classes inline in markup. |
| Component model | **String-concatenated HTML** inside JS, plus hand-written markup in each page.                                |
| Data            | 13 static JSON files fetched at runtime; writes go to `sessionStorage`/`localStorage`.                        |
| Icons           | Inline SVG, pasted per use site. Some in `assets/`, mostly literal.                                           |

---

## 2. COMPONENTS & DUPLICATION

This is the core finding. There is **no component layer** in `src/`. Every reusable element is
re-authored at each use site, and the class strings have diverged.

### 2.1 Divergence counts (measured)

Distinct class strings for what is visually one component:

| Component                                           | Distinct implementations | Files |
| --------------------------------------------------- | -----------------------: | ----: |
| **Primary button** (`bg-blue-600` + `text-white`)   |                   **37** |    25 |
| **Secondary button** (white + grey ring)            |                   **29** |    22 |
| **Text input** (`block w-full rounded-md bg-white`) |                   **17** |    12 |
| Select trigger                                      |           21 occurrences |     4 |
| Badge / pill                                        |           37 occurrences |    11 |
| Card / panel                                        |           38 occurrences |    11 |
| Modal (`el-dialog` / `<dialog>`)                    |          131 occurrences |    13 |
| Checkbox                                            |           21 occurrences |    11 |
| Toggle switch                                       |           11 occurrences |     4 |
| Skeleton / loading                                  |          157 occurrences |    16 |

### 2.2 Primary button — 37 variants

Same visual, different strings. Representative divergences:

- `rounded-md bg-blue-600 px-3.5 py-2.5 …` — `bills-and-payables.html`, `payables-pay.html`, `payment-preferences.html`
- `rounded-md bg-blue-600 px-2.5 py-1.5 …` — `payables-pay.html`, `payment-preferences.html`, `vendors.html`
- `w-full rounded-md bg-blue-600 px-3.5 py-2.5 …` — `payables-pay.html`, `payment-preferences.html`, `supplier-portal.html`
- `inline-flex h-11 flex-1 items-center justify-center gap-x-2 rounded-md bg-blue-600 …` — 6 onboarding pages
- `cursor-pointer rounded-md bg-blue-600 px-2 py-1 …` — `bills-payables-table.js`, `exchanges-table.js`
- `rounded bg-blue-600 px-2 py-1 … shadow-sm focus-visible:outline focus-visible:outline-2` — `exchanges-table.js`, `pages/payment-preferences-page.js` — **note `rounded` not `rounded-md`, `shadow-sm` not `shadow-xs`, and the Tailwind v3 `focus-visible:outline` idiom**
- `inline-flex w-full cursor-pointer … bg-blue-600 …` — `ap-ar-payments.html` (2 further one-off variants)

Padding alone appears as `px-2 py-1`, `px-2.5 py-1.5`, `px-3 py-2`, `px-3.5 py-2.5` — four sizes with
no naming that distinguishes them.

### 2.3 Secondary button — 29 variants, three incompatible ring idioms

The same 1px grey border is expressed three ways:

| Idiom                              | Example file                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `inset-ring inset-ring-gray-300`   | `payables-pay.html`, `supplier-portal.html`, onboarding pages                    |
| `ring-1 ring-inset ring-gray-300`  | `bills-and-payables.html`, `my-company-profile.html`, `payment-preferences.html` |
| `inset-ring-1 inset-ring-gray-300` | `bills-and-payables.html`, `supplier-portal.html`                                |

Two of these are Tailwind v4 syntax and one is v3 — they coexist in the same repo and, in
`bills-and-payables.html`, on the same page.

### 2.4 Text input — 17 variants, mixed outline syntax

- `outline-1 -outline-offset-1 outline-gray-300` (v4) — `supplier-portal.html`, onboarding pages
- `outline outline-1 -outline-offset-1 outline-gray-300` (v3) — `payables-pay.html`, `vendors.html`, `payment-preferences.html`, `bills-and-payables.html`

Plus divergence in text size/weight for the same field role: `text-base`, `text-base font-medium`,
`text-sm font-normal`, `text-sm font-medium`; and padding `px-3 py-1.5`, `py-2 pr-10 pl-3`,
`py-2.5 px-4`, `py-1.5 pr-3 pl-11`.

`my-company-profile.html` contains **two class strings that differ only in trailing whitespace or a
single utility** — evidence of copy-paste editing rather than shared definition.

### 2.5 Third parallel implementation: `react-app/`

`react-app/` is a complete second implementation of the same product, **not linked from the static
site** but importing the **same data files**:

```
react-app/src/data/source.js  ->  imports ../../../src/data/bills-payables.json, payees.json,
                                   vendor-profiles.json, payment-preferences-data.json,
                                   exchanges.json, customers.json, bank-accounts.json,
                                   check-addresses.json
```

It has the component layer that `src/` lacks:

| React component                                                        | Static equivalent                 |
| ---------------------------------------------------------------------- | --------------------------------- |
| `components/app/Button.jsx`                                            | 37 inline variants                |
| `components/app/Input.jsx`                                             | 17 inline variants                |
| `components/app/Modal.jsx`                                             | 131 inline `<dialog>` occurrences |
| `components/app/Icon.jsx` + `icon-registry.js`                         | inline SVG everywhere             |
| `components/DataTable.jsx`                                             | `exchanges-table.js` (7260 lines) |
| `components/Badge.jsx`, `SectionCard.jsx`, `loading/SkeletonBlock.jsx` | inline                            |
| `components/catalyst/*` (14 files)                                     | vendored Tailwind Catalyst kit    |

Feature pages: `features/payables/PayablesPage.jsx`, `features/vendors/VendorsPage.jsx`,
`features/vendors/VendorProfilePage.jsx`, `features/payment-preferences/PaymentPreferencesPage.jsx`,
`features/design-system/DesignSystemPage.jsx`.

**Note:** `react-app/src/features/` has **no onboarding**. The two implementations do not cover the
same surface, so neither can simply replace the other.

### 2.6 Naming conventions actually in use

Reported as found, not as they should be.

**Files** — consistently `kebab-case.js` / `kebab-case.html`. No exceptions in `src/`. This is the
one convention that holds throughout and should be preserved.

**Element IDs** — page-scoped prefixes, four different ones, applied inconsistently:

| Prefix     |                                               Count | Meaning                                                                          |
| ---------- | --------------------------------------------------: | -------------------------------------------------------------------------------- |
| `gp-`      |                                                 296 | "get paid" panel (inside supplier-portal)                                        |
| `pp-`      |                                                 286 | payment preferences **and** payables-pay — two different pages share this prefix |
| `sx-`      |                                                  71 | smart exchange / supplier portal                                                 |
| `bp-`      |                                                  49 | bills & payables                                                                 |
| `sd-`      |                                                 ~40 | SMART Disburse (onboarding)                                                      |
| unprefixed | `business-`, `vendor-`, `contact-`, `main-`, `app-` |                                                                                  |

`pp-` is overloaded across two unrelated pages — a real collision risk if pages are ever composed.

**JS naming** — `camelCase` functions, `UPPER_SNAKE` module constants. Consistent.

**Storage keys** — three competing schemes:

- `kebab-case-v1`: `bp-row-overrides-v1`, `bp-cards-dataset-v1`, `bp-origination-accounts-v1`, `bp-pay-page-view-context-v1`, `dashboard-sidebar-collapsed-v1`, `sd-sx-token-test-config-v1`
- `snake_case_v#`: `sx_exchange_entry_overrides_v1`, `sx_global_stp_state_v3`, `sx_global_stp_status_v2`
- unversioned kebab: `sd-onboarding-state`, `sd-onboarding-complete-state`

**CSS** — Tailwind utilities only, no custom class names except JS-managed state hooks
(`ob-skel`, `app-skel-row`, `sd-context-skeleton-target`, `chevron-icon`, `nav-label`,
`stagger-item`, `copy-btn`).

**Data attributes** — `data-*` used as the JS↔markup contract: `data-nav`, `data-page`,
`data-ob-content`, `data-ob-skeleton`, `data-column-order-row`, `data-topbar-business`,
`data-filter-count`. Consistent and worth keeping.

---

## 3. DATA & LOGIC

### 3.1 External vs hardcoded

**External** — `src/data/*.json`, 13 files:

| File                            |   Size | Consumers                                 |
| ------------------------------- | -----: | ----------------------------------------- |
| `bills-payables.json`           | 148 KB | 15 references                             |
| `exchanges.json`                |  54 KB | 7                                         |
| `payees.json`                   |  21 KB | 12                                        |
| `vendor-profiles.json`          | 9.1 KB | 3                                         |
| `payment-preferences-data.json` | 4.5 KB | 7                                         |
| `cards.json`                    | 3.1 KB | 3                                         |
| `customers.json`                | 2.9 KB | 4                                         |
| `nav.json`                      | 2.9 KB | **stale, see below**                      |
| `bank-accounts.json`            | 1.4 KB | 7                                         |
| `onboarding-steps.json`         | 1.0 KB | mirrored in JS                            |
| `my-company-profile.json`       | 0.9 KB | 4                                         |
| `check-addresses.json`          | 0.6 KB | 7                                         |
| `public-runtime-config.json`    | 0.4 KB | 3 (Worker base URL, test-email allowlist) |

All reads funnel through `src/scripts/data-source.js` (95 lines), which is the single fetch seam —
this part is already clean and should be kept.

**Hardcoded structures inside JS** (≥8 lines):

| Constant                     | File                      | Lines |
| ---------------------------- | ------------------------- | ----: |
| `APP_NAV_DATA`               | `nav-component.js`        |    54 |
| `MODULES`                    | `app-plans.js`            |    48 |
| `PAGE_CONFIGS`               | `shell-navigation.js`     |    33 |
| `BREADCRUMB_CONFIGS`         | `shared.js`               |    25 |
| `TOPBAR_BREADCRUMB_CONFIGS`  | `topbar-component.js`     |    25 |
| `PLANS`                      | `app-plans.js`            |    23 |
| `APP_NAV_ICONS`              | `nav-component.js`        |    20 |
| `STATUS_STYLES`              | `exchanges-table.js`      |    11 |
| `STATUS_STYLES`              | `bills-payables-table.js` |    11 |
| `STEPS`                      | `onboarding-stepper.js`   |    10 |
| `OPTIONS`                    | `paywall.js`              |    10 |
| `APP_NAV_PAGE_MAP`           | `nav-component.js`        |     9 |
| `RULES`                      | `create-account.js`       |     9 |
| `APP_NAV_REACT_ROUTE_MAP`    | `nav-component.js`        |     8 |
| `BREADCRUMB_REACT_ROUTE_MAP` | `shared.js`               |     8 |

### 3.2 Duplicated registries — the same 7 pages listed 7 times

Seven separate structures enumerate the same dashboard pages:

| Structure                   | File                  | Pages listed |
| --------------------------- | --------------------- | ------------ |
| `BREADCRUMB_CONFIGS`        | `shared.js`           | 7            |
| `TOPBAR_BREADCRUMB_CONFIGS` | `topbar-component.js` | 7 (same 7)   |
| `PAGE_CONFIGS`              | `shell-navigation.js` | 7 (same 7)   |
| `APP_NAV_PAGE_MAP`          | `nav-component.js`    | 8            |
| `APP_NAV_REACT_ROUTE_MAP`   | `nav-component.js`    | 7            |
| `APP_NAV_DATA`              | `nav-component.js`    | 5            |
| `MODULES`                   | `app-plans.js`        | 8            |

Adding a page means editing up to seven places. `PROJECT_RULES.md` line 15 acknowledges two of
them ("must be registered in both `nav.json` and the component's page-id map") but not the other five.

### 3.3 Navigation defined three times — and already drifted

| Source                               | "Supplier Portal" item reads                    |
| ------------------------------------ | ----------------------------------------------- |
| `src/data/nav.json`                  | **"SMART Exchange"** ← stale                    |
| `APP_NAV_DATA` in `nav-component.js` | "Supplier Portal"                               |
| `MODULES` in `app-plans.js`          | "Supplier Portal" (+ per-plan alias "Payments") |

`nav.json` is the file `PROJECT_RULES.md` designates as the source of truth, and it is the one that
is wrong. It is loaded by nothing at runtime — `nav-component.js` uses its inline copy, and
`app-plans.js` now supersedes both. This drift is live today, not hypothetical.

### 3.4 Markup + logic + data in the same function

**JS emitting HTML strings.** Table renderers build markup by concatenation, mixing data shaping,
business rules and presentation in one function:

- `exchanges-table.js` (7260 lines) — row rendering, sorting, filtering, pagination, column
  management, drag-reorder, Get-Paid panel, STP guide tooltips, modals. Contains `STATUS_STYLES`,
  method labels, and ~10 distinct button class strings inline.
- `payables-pay.js` (5404 lines) — same pattern for the pay flow, plus token-service HTTP calls
  (`fetch(baseUrl + '/send-test-token')` at line 2407) beside DOM building.
- `bills-payables-table.js` (3056 lines) — near-parallel logic to `exchanges-table.js` for a
  different dataset (see §5.2).

**HTML containing logic.** 1,377 lines of JavaScript live inside `<script>` blocks in onboarding
pages, in direct violation of `PROJECT_RULES.md` line 66:

| Page                                   | Inline JS lines |
| -------------------------------------- | --------------: |
| `onboarding/complete.html`             |             398 |
| `onboarding/debit-account-info.html`   |             318 |
| `onboarding/summary.html`              |             142 |
| `onboarding/confirm-identity.html`     |             116 |
| `onboarding/instant-virtual-card.html` |              98 |
| `onboarding/debit-card-details.html`   |              96 |
| `onboarding/paywall.html`              |              83 |
| `onboarding/review-documents.html`     |              65 |
| `onboarding/signature.html`            |              61 |

One `onclick=` attribute remains in `onboarding/summary.html`, also against rule line 67.

### 3.5 Global state

There is no state container. State lives in three places:

**1. `window.*` namespaces — 10 globals**, load-order dependent, no dependency declaration:

```
window.AppPlans              window.OnboardingSteps       window.SDOnboardingContext
window.AppSwitch             window.OnboardingTransitions window.STPState
window.DataSource            window.PPComponents          window.TableSkeleton
window.VendorsData
```

Order is enforced only by `<script>` tag sequence hand-maintained in 22 HTML files. Three scripts
are **not** IIFE-wrapped — `nav-component.js`, `confirm-identity.js`, `confirm-business-details.js` —
so their top-level `const`s (`APP_NAV_DATA`, `APP_NAV_ICONS`, `APP_NAV_PAGE_MAP`,
`APP_NAV_REACT_ROUTE_MAP`, `HELP_ICON_SVG`, `SMART_HUB_LOGO_*`) are true globals.

**2. Browser storage — 11 keys, 47 call sites**, no wrapper, no schema, no migration:

```
localStorage    bp-row-overrides-v1, bp-cards-dataset-v1, bp-origination-accounts-v1,
                dashboard-sidebar-collapsed-v1, sx_exchange_entry_overrides_v1,
                sx_global_stp_state_v3, sx_global_stp_status_v2, sd-sx-token-test-config-v1, theme
sessionStorage  sd-onboarding-state, sd-onboarding-complete-state, bp-pay-page-view-context-v1
```

`sd-onboarding-state` is the de-facto onboarding store, written from 6 different files
(`sd-onboarding-context.js`, `paywall.js`, `create-account.js`, and three inline page scripts) with
no shared accessor — each reimplements its own `getState`/`saveState` pair.

**3. In-memory module state** — e.g. `app-plans.js` holds `activeBusinessId` plus a listener array;
`exchanges-table.js` and `bills-payables-table.js` each hold large private `state` objects. None of
it survives a page navigation, which matters because every navigation is a full document load.

---

## 4. STYLING

### 4.1 Tokens: none in effect

- `tailwind.config.js` exists with `theme.extend = {}` — **no tokens defined**, and it is **dead**:
  the app loads `@tailwindcss/browser@4` from CDN in all 22 pages, and the browser build does not
  read a config file.
- `src/styles/global.css` (75 lines: cursor rules, `@tailwind` directives) is **referenced by no
  file**. Confirmed: `grep -rl 'global.css' src index.html` returns nothing.
- Therefore **every colour, spacing and type value is a literal utility class in markup**.

The only variables in the codebase are runtime CSS custom properties injected by JS for skeletons:

| Variable                                                     | Defined in                  |
| ------------------------------------------------------------ | --------------------------- |
| `--ob-skel-bg`, `--ob-skel-bg-strong`, `--ob-skel-radius`    | `onboarding-transitions.js` |
| `--app-skel-bg`, `--app-skel-strong`, `--app-switch-veil-bg` | `app-switch.js`             |

These are the only named design values in the project, and they cover one concern (loading states).

### 4.2 Brand colours as scattered literals

The navy gradient is hand-written per use rather than tokenised:

```
bg-gradient-to-b from-[#1E326F] to-[#090C38]     onboarding sidebars, mobile header, menu sheet
bg-[linear-gradient(108deg,#3773FF_3.3%,#2254CA_99.23%)]    paywall amount card
bg-[linear-gradient(162.63deg,#3773FF_3.3%,#2254CA_99.23%)] create-account Next button
```

Two gradients share the same stops at different angles, written as separate arbitrary values.
`#6B7280` appears as a literal `fill` in supplied SVG markup alongside `currentColor` usage elsewhere.

### 4.3 Inconsistent implementations of one visual pattern

| Pattern         | Divergence                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1px grey border | `inset-ring inset-ring-gray-300` / `ring-1 ring-inset ring-gray-300` / `inset-ring-1 inset-ring-gray-300`                                  |
| Input outline   | `outline-1 …` (v4) vs `outline outline-1 …` (v3)                                                                                           |
| Button shadow   | `shadow-xs` vs `shadow-sm`                                                                                                                 |
| Button radius   | `rounded-md` vs `rounded`                                                                                                                  |
| Focus ring      | `focus-visible:outline-2 focus-visible:outline-offset-2` vs `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2` |
| Badge shape     | `rounded-full` (status pills) vs `rounded-sm` (Exceptions, Upgrade, filter count)                                                          |
| Dark mode       | `dark:bg-white/5` vs `dark:bg-white/10` for the same secondary-button surface                                                              |

Mixed Tailwind v3 and v4 syntax is the through-line. Both render, so nothing has surfaced as a bug,
but it means no find-and-replace can safely normalise styling today.

### 4.4 Inline `<style>` blocks

10 pages carry their own `<style>` block (`payables-pay.html`, `payment-preferences.html`,
`supplier-portal.html` have 2 each). Each declares `@custom-variant dark (&:where(.dark, .dark *));`
plus page-local keyframes — duplicated per page rather than shared.

---

## 5. PAIN POINTS

Ranked by how much each blocks modularity **in this codebase**, most impactful first.

### 5.1 — No component layer, 83 divergent implementations of 3 elements

37 primary buttons + 29 secondary buttons + 17 inputs, spread over 25 files. Changing the button
style is a 37-site edit with no way to verify completeness, and the v3/v4 syntax mix means
mechanical replacement is unsafe. **This is the single largest obstacle**: nothing else can be
cleanly extracted while the primitives are literals.

_Evidence:_ §2.2–2.4. Reproduce with the class-clustering script pattern in §2.1.

### 5.2 — Two 3,000–7,000-line table engines doing near-identical work

`exchanges-table.js` (7260) and `bills-payables-table.js` (3056) independently implement: row
rendering, sorting, filtering with faceted panels, pagination, column show/hide, column drag-reorder,
skeletons, status pills, row expansion, and modals. During this audit's period both required the
_same_ fix applied twice (Exceptions badge, drag lift, filter count badge, chevron, export icon,
grip icon — each edited in both files). `payables-pay.js` (5404) repeats a third variant of the
filter/modal machinery.

Any table change costs 2–3× and can silently diverge.

### 5.3 — The same page registry maintained in seven places

§3.2. Adding or renaming a page requires edits in `shared.js`, `topbar-component.js`,
`shell-navigation.js`, `nav-component.js` (×3 structures) and `app-plans.js`. §3.3 shows this has
**already failed**: `nav.json` still says "SMART Exchange" after the rename.

### 5.4 — 1,377 lines of business logic inside HTML

§3.4. Nine onboarding pages carry inline `<script>` blocks, including 398 lines in `complete.html`
and 318 in `debit-account-info.html`. This logic cannot be tested, reused, or linted, and each block
reimplements `getState`/`saveState` for the shared `sd-onboarding-state` key. Directly violates
`PROJECT_RULES.md` line 66.

### 5.5 — No design tokens, and both styling config files are dead

§4.1. `tailwind.config.js` is not read (CDN build) and `global.css` is imported by nothing. There is
no place to define a colour or spacing scale, so §5.1 has nowhere to extract _to_. Fixing 5.1
requires fixing this first.

### 5.6 — Load-order-dependent globals with no module system

§3.5. Ten `window.*` namespaces, ordering hand-maintained across 22 pages, three scripts leaking
top-level constants. Adding a dependency means editing every page's `<head>`; a wrong order fails
silently at runtime. Dashboard pages now carry 14–16 `<script>` tags each.

### 5.7 — Unwrapped browser storage as the only persistence

§3.5. 11 keys, three naming schemes, 47 unwrapped call sites, no schema or migration path. Nothing a
user does survives a device change, and two flows share `sd-onboarding-state` without a common
accessor.

### 5.8 — A parallel React implementation sharing the same data

§2.5. `react-app/` has the component layer `src/` lacks but covers only 4 of the product surfaces and
none of onboarding. It imports `src/data/*.json` directly, so data-shape changes silently affect
both. Its existence is either the intended migration target or dead weight — that is unresolved, and
the ambiguity itself is a cost.

### 5.9 — Repository noise

`.history/` and `.lh/` hold ~459 editor-history files, `tmp-icons/` is unreferenced scratch,
`react-app/catalyst-ui-kit 3/` contains a vendored kit with its own `.next/` build output committed.
This inflates search results and obscures the real tree.

### 5.10 — Documentation drift

`README.md` references `smart-exchange.html` three times (renamed to `supplier-portal.html`).
`PROJECT_RULES.md` §"Known tech debt" names two inline-script files as targets; there are nine.

---

## 6. PROPOSED TARGET STRUCTURE — recommendation only

Design goals: keep what already works (kebab-case files, `data-*` contracts, the `DataSource` seam,
the `<app-nav>`/`<app-topbar>` component idea), and give the divergent primitives somewhere to live.
No framework introduction is assumed — this works with the current no-build, CDN-Tailwind setup.

### 6.1 Target tree

```
src/
├── design/                          NEW — the missing token + primitive layer
│   ├── tokens.js                      colour/spacing/radius/shadow as JS constants,
│   │                                  exported as CSS custom properties at boot
│   └── ui/                            one file per primitive, returns HTML strings
│       ├── button.js                  button({variant:'primary'|'secondary'|'link',
│       │                              size:'xs'|'sm'|'md'|'lg', icon, iconPosition})
│       ├── input.js                   input({type,size,invalid,leadingIcon})
│       ├── select.js                  el-select trigger
│       ├── badge.js                   badge({tone:'neutral'|'success'|'warning'|'danger',
│       │                              shape:'pill'|'rect'})
│       ├── card.js  modal.js  checkbox.js  toggle.js  skeleton.js
│       └── icon.js                    icon registry — replaces pasted inline SVG
│
├── shell/                           NEW — extracted from today's scattered chrome
│   ├── app-nav.js                     was nav-component.js (render only)
│   ├── app-topbar.js                  was topbar-component.js (render only)
│   ├── sidebar.js                     unchanged behaviour
│   └── page-registry.js               SINGLE source replacing the 7 structures in §3.2
│
├── features/                        NEW — one folder per product surface
│   ├── table/                         SHARED engine extracted from the two table files
│   │   ├── table-core.js                render, sort, paginate
│   │   ├── table-filters.js             faceted filter panel + active-filter tags
│   │   ├── table-columns.js             show/hide + drag reorder + Manage Columns modal
│   │   └── table-skeleton.js            moved from src/scripts/
│   ├── exchanges/exchanges-page.js      was exchanges-table.js, minus the shared engine
│   ├── payables/payables-page.js        was bills-payables-table.js, minus the engine
│   ├── payables-pay/pay-page.js         was payables-pay.js
│   ├── vendors/                         vendors-page.js + vendor-profile-page.js + vendors-data.js
│   ├── payment-preferences/             pages/payment-preferences-page.js + -components.js + -tabs.js
│   ├── my-company-profile/              pages/my-company-profile-page.js
│   └── plans/                           app-plans.js, app-switch.js, ap-ar-upgrade.js
│
├── onboarding/                      MOVED from scripts/, plus the 1,377 extracted lines
│   ├── onboarding-context.js          was sd-onboarding-context.js (drop the sd- prefix)
│   ├── onboarding-state.js            NEW — the shared getState/saveState the 6 copies need
│   ├── onboarding-stepper.js          unchanged
│   ├── onboarding-transitions.js      unchanged
│   ├── onboarding-mobile-header.js    unchanged
│   └── steps/                         one file per step — receives §3.4's inline blocks
│       ├── confirm-identity.js  confirm-business-details.js  review-documents.js
│       ├── signature.js  paywall.js  instant-virtual-card.js  debit-card-details.js
│       └── debit-account-info.js  summary.js  create-account.js  complete.js
│
├── platform/                        NEW — cross-cutting infrastructure
│   ├── data-source.js                 moved unchanged; already the single fetch seam
│   ├── storage.js                     NEW — wraps the 11 keys, one naming scheme, migrations
│   └── theme.js                       was theme-init.js
│
├── data/                            UNCHANGED (13 JSON files)
├── pages/                           UNCHANGED paths — dashboard/, onboarding/, tools/
└── styles/
    └── global.css                     either wire it up or delete it; today it is dead
```

### 6.2 What moves where, and why

| From                                                                                                                                         | To                                | Why                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| 83 inline button/input class strings                                                                                                         | `design/ui/button.js`, `input.js` | §5.1. One definition, variants as parameters. Normalise v3→v4 syntax during the move. |
| Shared logic in `exchanges-table.js` + `bills-payables-table.js`                                                                             | `features/table/*`                | §5.2. Both files keep only their column definitions, data shaping and page wiring.    |
| `BREADCRUMB_CONFIGS`, `TOPBAR_BREADCRUMB_CONFIGS`, `PAGE_CONFIGS`, `APP_NAV_PAGE_MAP`, `APP_NAV_REACT_ROUTE_MAP`, `APP_NAV_DATA`, `nav.json` | `shell/page-registry.js`          | §5.3. One record per page: id, file, label, breadcrumb, module, react route.          |
| 1,377 lines of inline `<script>`                                                                                                             | `onboarding/steps/*.js`           | §5.4. Testable, lintable, and rule-compliant.                                         |
| Six private `getState`/`saveState` pairs                                                                                                     | `onboarding/onboarding-state.js`  | §3.5. One accessor for `sd-onboarding-state`.                                         |
| 47 raw storage calls                                                                                                                         | `platform/storage.js`             | §5.7. One naming scheme, one migration point.                                         |
| Pasted inline SVG                                                                                                                            | `design/ui/icon.js`               | Mirrors `react-app/src/components/app/icon-registry.js`, which already solves this.   |
| Brand gradients (§4.2)                                                                                                                       | `design/tokens.js`                | Two angles of one gradient become one token with a parameter.                         |

### 6.3 Conventions to keep unchanged

- **kebab-case filenames** — consistent today, no reason to touch.
- **`data-*` attributes as the JS↔markup contract** — already the cleanest seam in the codebase.
- **`src/data/*.json` shapes** — `react-app/` imports them directly; changing shapes breaks it.
- **`src/pages/**`URLs** — GitHub Pages links and the Worker's`APP_BASE_URL` depend on them.
- **`DataSource.load()`** — keep as-is; it is already the single read seam and is API-ready.
- **IIFE + `window.*` namespacing** — keep for now. Moving to ESM is a separate decision with a
  real cost (22 pages of `<script type="module">`, CORS on `file://`), and should not be bundled
  into a structural refactor.

### 6.4 Suggested sequencing

1. **`design/tokens.js` + `design/ui/`** — nothing else can be extracted until primitives exist (§5.5 blocks §5.1).
2. **Migrate one page** (`vendors.html`, 155 lines, 3 script deps) to the primitives as a proof.
3. **`shell/page-registry.js`** — collapse the 7 registries; fixes the live `nav.json` drift.
4. **`features/table/`** — extract from the two table engines; highest ongoing saving.
5. **`onboarding/steps/`** — lift the inline scripts out.
6. **`platform/storage.js`** — wrap the keys.
7. **Decide `react-app/`** — adopt as the migration target, or remove. Do not leave it ambiguous.

### 6.5 Out of scope for restructuring — flag, do not fix silently

- `.history/`, `.lh/`, `tmp-icons/`, `react-app/catalyst-ui-kit 3/.next/` should be gitignored, but
  deleting them changes nothing functional. Confirm before removing.
- `README.md`'s three stale `smart-exchange.html` references and `PROJECT_RULES.md`'s outdated tech-debt
  list are documentation fixes, not restructuring.
- `tailwind.config.js` and `src/styles/global.css` are dead. Deleting them is safe **only** if the
  CDN Tailwind setup is retained; if a build step is introduced later, both become relevant again.

---

## Appendix — how to reproduce the key measurements

```bash
# Component divergence (§2.1–2.4): cluster class strings by component signature
#   scan src/pages/**/*.html + src/scripts/**/*.js for class="..." and class=\'...\'
#   group by presence of bg-blue-600+text-white / inset-ring-gray-300 / block w-full rounded-md bg-white

# Inline JS in HTML (§3.4)
#   regex <script(?![^>]*\bsrc=)[^>]*>(.*?)</script> over src/pages/**/*.html, count newlines

# Page-registry duplication (§3.2)
awk '/(const|var) BREADCRUMB_CONFIGS/,/^};?$/' src/scripts/shared.js | grep -oE "'[a-z-]+\.html'"
#   repeat for TOPBAR_BREADCRUMB_CONFIGS, PAGE_CONFIGS, APP_NAV_PAGE_MAP,
#   APP_NAV_REACT_ROUTE_MAP, APP_NAV_DATA, MODULES

# Dead styling config (§4.1)
grep -rl 'global.css' src index.html          # returns nothing
grep -rho 'cdn.jsdelivr.net/npm/@tailwindcss[^"]*' src/pages index.html | sort | uniq -c

# Globals and storage (§3.5)
grep -rhoE "window\.[A-Z][A-Za-z]+ = " src/scripts/*.js | sort -u
grep -rhoE "(STORAGE_KEY|STATE_KEY|KEY|COMPLETE_KEY)\s*=\s*'[^']+'" src/scripts/*.js src/pages/**/*.html
```
