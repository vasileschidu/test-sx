---
name: components
description: Inventory of the SMART prototype's existing components and shared modules — exact markup (details card, description list, select field, buttons, toggle, options) and JS APIs (app-nav, app-topbar, TableUi, TableSkeleton, OBModal, OBField, OBSign, OBConsents, OnboardingTransitions, PPComponents, DataSource). Use before writing any markup; copy what exists instead of inventing it.
---

# Components inventory

Rule: if it's listed, reuse it exactly (classes, DOM, states). If it isn't, build it with every
state and add a row here in the same change. Tokens: see the `design-system` skill.

## Shell (every dashboard page)

| Component | Where | Use |
|---|---|---|
| Sidebar | `<app-nav>` · `nav-component.js`, `sidebar.js`, `sidebar-boot.js` | never hand-write nav markup; active item from `body[data-page]` |
| Top bar | `<app-topbar>` · `topbar-component.js` | title/breadcrumbs from `data-title` / page path; business + account menus built in |
| Shell glue | `shared.js` (load on every dashboard page) | tooltips (`data-tooltip="…"`, `data-tooltip-side`), focus/cursor rules, theme |
| Product switch | `AppPlans`, `AppSwitch` (`app-plans.js`, `app-switch.js`) | which portal/plan is active, cross-product links |
| Data | `DataSource.load(paths)` (`data-source.js`) | the only JSON loader; `DataSource.configure({ apiBaseUrl })` swaps to an API |

## Tables

| Component | Where | Use |
|---|---|---|
| Table helpers | `TableUi.icon(name, w, h)`, `.filterChip()`, `.filterCheckbox()` (`table-ui.js`) | filter chips, checkboxes, icons in every table |
| Table skeleton | `TableSkeleton.render({ tableEl, columns, rowCount, headerHtml })` | loading state of any table (52px rows) |
| Shared filter | spec in `wiki/design-system/table-filter.md` | same filter / Manage columns behaviour in Hub, Exchange, Consumer Portal |
| Row actions, tabs, pagination | `exchanges-table.js`, `bills-payables-table.js`, `consumer-exchanges-table.js` | copy from the nearest table, don't re-invent |

## Payment preferences

`PPComponents` (`payment-preferences-components.js`): `createBankAccountRow`, `createCardAccountRow`,
`createCheckAddressRow`, `createAccountDetailsComponent`, `createMiniCardComponent`,
`buildDescriptionListItem`, `buildBankValidationIcon`, `buildAccountActionMenu`. Tabs:
`payment-preferences-tabs.js`. STP banner/state: `STPState` (`stp-state.js`).

## SMART Disburse flow (`src/pages/onboarding/`)

| Component | Where |
|---|---|
| Step shell, stepper, mobile header | `onboarding-sidebar.js`, `OnboardingSteps` (`onboarding-stepper.js`), `onboarding-mobile-header.js` |
| Step change + loading | `OnboardingTransitions` / `OBGo(href)` (`onboarding-transitions.js`); mark token values with `data-ob-skeleton`, async content with `OnboardingTransitions.waitFor(promise)` |
| Token data | `SDOnboardingContext.bootstrap()` / `getState()` / `saveState()` |
| Dialog shell | `OBModal` (blur, Esc, focus trap); `OBContact` = Contact Us |
| Text field | `OBField` — SMART System „Text Field [New]" with default/hover/focus/disabled/error |
| Sign to authorize | `OBSign.open({ name, allowedPattern, allowedMessage, onSigned })` |
| Consents | `OBConsents.mount(listEl, agreements, { stateKey, onChange })` |
| Decline, faster payout, VC how-to | `OBDecline`, `OBFaster`, `OBVirtualCardHow` |
| Multi-Party | `OBFlow` (`onboarding-flow.js`), `onboarding-multi-party.js` |
| Review documents | `review-modal.js` — any `[data-review-modal]` dialog, triggers `.review-trigger` / `.gp-review-trigger` |

## Markup patterns (copy exactly)

### Details card (`@details card`)
```html
<div class="flex flex-col items-start self-stretch">
  <div class="flex items-center justify-between self-stretch px-4 py-2 rounded-t-md border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/10">
    <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Title</span>
    <!-- optional Edit: text-xs font-semibold text-gray-600 + pencil size-3.5 -->
  </div>
  <div class="flex flex-col items-start gap-2 self-stretch p-4 rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
    <!-- description list rows -->
  </div>
</div>
```

### Description list row
```html
<div class="grid grid-cols-2 gap-4 self-stretch">
  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Label</span>
  <span class="text-sm font-normal text-gray-700 dark:text-gray-300">Value</span>
</div>
```
Labels `font-medium` (never semibold); addresses add `whitespace-pre-line`; no dividers.

### Select field (`el-select` trigger) — wrap in `<el-select name="…" class="block">`
```html
<button type="button" class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10">
  <el-selectedcontent class="col-start-1 row-start-1 flex items-center gap-2 pr-6 text-gray-900 dark:text-white"><span class="truncate text-gray-400 dark:text-gray-500">Placeholder</span></el-selectedcontent>
  <!-- chevron-up-down svg: col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 -->
</button>
```
Options: name `font-normal group-aria-selected/option:font-semibold`. Two-line option with a
one-line selected value: two-line block `in-[el-selectedcontent]:hidden` + a
`hidden in-[el-selectedcontent]:block truncate` span.

### Buttons
- Secondary: `bg-white text-gray-900 font-semibold shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50`;
  sizes xs `rounded-sm px-2 py-1 text-xs` · sm `rounded-sm px-2 py-1 text-sm` · md `rounded-md px-2.5 py-1.5 text-sm`
  · lg `rounded-md px-3 py-2 text-sm` · xl `rounded-md px-3.5 py-2.5 text-sm`. With icon: `inline-flex items-center gap-1.5`.
  „Verify now"-style actions use **sm**.
- Link button (Add card / Add bank account / Filter / Download): `inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300` + size-4 icon, no background.
- Primary: `cursor-pointer rounded-md bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300`
  + size from the secondary list (most used: xl `px-3.5 py-2.5`, md `px-2.5 py-1.5`; full-width CTA adds `w-full`).

### Toggle switch (checkbox-based)
```html
<div class="group relative inline-flex w-11 shrink-0 cursor-pointer rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2">
  <span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"></span>
  <input type="checkbox" name="…" aria-label="…" class="absolute inset-0 size-full appearance-none cursor-pointer focus:outline-hidden" />
</div>
```

## Adding a component
1. Build every state (default, hover, focus-visible, active, disabled, error, loading; dark on dashboard).
2. Add a row/snippet here, and a note to `wiki/design-system/` when it is a product pattern.
3. If it exists in Figma SMART System, name it the same.
