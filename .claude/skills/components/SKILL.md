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
| Copy value button | `OBModal.copyButton(label, value)`: 18px icon button, hover chip, "Copy"/"Copied" tooltip, green check; click handled by OBModal. Used by the Contact Us card (`copyRow`) and SX card details (`sx-enroll-complete.js`). Don't build another copy button. |
| Text field | `OBField` — SMART System „Text Field [New]" with default/hover/focus/disabled/error |
| Sign to authorize | `OBSign.open({ name, allowedPattern, allowedMessage, onSigned })` |
| Consents | `OBConsents.mount(listEl, agreements, { stateKey, onChange, documentScroll })` — `documentScroll` (SX only): the grey box hugs the text, the dialog body scrolls it, white bottom fade + centred round gray (bg-gray-100, 2px white inset-ring) "scroll down" button until the end (both hide there) (Accept unlocks there) |
| Decline, faster payout, VC how-to | `OBDecline`, `OBFaster`, `OBVirtualCardHow` |
| Multi-Party | `OBFlow` (`onboarding-flow.js`), `onboarding-multi-party.js` |
| Review documents | `review-modal.js` — any `[data-review-modal]` dialog, triggers `.review-trigger` / `.gp-review-trigger` |
| Reuse in another flow | set `window.OB_FLOW_STEPS` / `OB_MOBILE_MENU` before the sidebar/stepper load; wrap `OBGo` instead of editing SD scripts — see `sx-enroll.js` (SMART Exchange enrolment, `src/pages/sx-enroll/`) |
| Demo "open the email link" | waiting card in `sx-enroll-acp.js`: link button `<a target="_blank" rel="noopener">` + external-link icon + sr-only "(opens in a new tab)", only when the email was not delivered (test mode) |
| Presenter email opt-in | launcher (`demo/stp-case.html`): `<app-checkbox label description>` under the email hint, shown only for addresses off the config allowlist; list in localStorage `sx_extra_allowed_emails_v1` (read by `STPState`) |
| SX enrolment helpers | `SXEnroll.textField(id, label, value, opts)` (OBField + error line), `.row(label, html)`, `.fieldError(input, msg)`, `.setLoading(btn, label)` → restore fn |

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
- Gray (Figma "Button/Gray", e.g. Reveal Card Details on `sx-enroll/complete.html`): `inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white`
  + trailing `size-4.5 text-gray-500 dark:text-gray-400` icon.

### Toggle switch (checkbox-based)
```html
<div class="group relative inline-flex w-11 shrink-0 cursor-pointer rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2">
  <span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"></span>
  <input type="checkbox" name="…" aria-label="…" class="absolute inset-0 size-full appearance-none cursor-pointer focus:outline-hidden" />
</div>
```

### Segmented control (radio group, one row) — SD demo Scenario panel (`onboarding-flow.js` `segmented()`)
Picks one of 2–4 short options. Container `grid grid-cols-{n} gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5`; each option:
```html
<label class="relative flex min-h-8 cursor-pointer items-center justify-center rounded-md px-1.5 py-1 text-center text-xs leading-4 font-medium text-gray-600 hover:bg-white/60 hover:text-gray-900 has-checked:bg-white has-checked:text-gray-900 has-checked:shadow-xs has-checked:ring-1 has-checked:ring-gray-900/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-blue-600 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white dark:has-checked:bg-white/15 dark:has-checked:text-white dark:has-checked:ring-white/10 dark:has-focus-visible:outline-blue-400">
  <input type="radio" name="…" value="…" class="sr-only">Label
</label>
```
Wrap in `<fieldset>` with `<legend class="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">`. Labels may wrap to two lines (`leading-4`).

### Read-only details box (no header; Figma SX enrolment / Get paid)
`<div class="flex flex-col gap-4 rounded-md bg-gray-50 p-4 dark:bg-white/5">` + description list rows.
Use when Figma shows a plain gray box; an Edit action goes above the box (right-aligned xs link), not in a header bar.

### Radio card with expanding form (`sx-enroll-acp.js`)
`fieldset` (disable it while loading) → per option `div.overflow-hidden.rounded-lg.border.border-gray-200.bg-white` >
`label.flex.cursor-pointer.items-center.gap-3.px-4.py-3.hover:bg-gray-50.has-checked:bg-gray-50.has-disabled:cursor-not-allowed`
with the launcher's native radio (`appearance-none … checked:bg-blue-600 … disabled:bg-gray-100`); the checked option
renders its form below in `div.flex.flex-col.gap-4.border-t.border-gray-200.p-4` (OBField inputs + primary md button).

### Status card (acknowledgement / waiting)
`section.overflow-hidden.rounded-lg.border.border-gray-200` > `h2` title row `border-b px-4 py-3 text-sm font-semibold` >
rows `p-4 gap-2` (description list) > optional footer `border-t px-4 py-3`. Status badges: `rounded-md bg-green-50 px-2 py-0.5
text-xs font-medium text-green-700 inset-ring inset-ring-green-600/20` (Completed) / blue-50·blue-700·blue-700/10 (In Process).

### Static link page + "link expired" (`sx-enroll/sign-agreement.html`)
Email-link pages without the step menu: `body.bg-white.lg:bg-gray-100` > white column `mx-auto max-w-5xl` > `main.max-w-148`
(hero from card-processing.html, `type-title-page` + `type-description`) + `<div data-ob-footer>` (SD footer, Powered by Transcard).
Document preview: scroll box `h-96 lg:h-150 overflow-y-auto rounded-lg border bg-gray-50 p-4` + `SXEnroll.agreementArticle()`
(Visa agreement, from `sx-enroll-acp.js`). Loading over a box/card: `relative` parent + `absolute inset-0 bg-white/70` with
`onboarding/loader.svg` `size-11 animate-spin` (`role="status"`), controls disabled. Invalid / used link: full-page `bg-gray-100`
centred `max-w-sm rounded-lg bg-white p-6 text-center` card, `size-12 rounded-full bg-red-50` + `icon-x-circle-red.svg`, `type-title-small`.

Toggle switch disabled: add `has-disabled:cursor-not-allowed has-disabled:opacity-50` on the track, `disabled:cursor-not-allowed` on the input.
Password reveal: eye button `absolute top-1/2 right-2 size-7 -translate-y-1/2 rounded-md text-gray-400 hover:bg-gray-100` in the input's `relative` wrapper, `aria-pressed`.

### STP set-up steps list (one step at a time) — `STPState.openSetupStepsModal()`
Rendered by `renderSetupSteps` in `stp-state.js` from the STP step (+ `SXDemoCase.enrol.cardProcessed` on the case instance):
`ol` > `li.flex.gap-3` with a `w-5` marker column (done: `size-5 rounded-full bg-blue-600` + white check; current: number in
`border-blue-400 bg-blue-100 text-blue-700`; future: number in `border-gray-200 bg-gray-100 text-gray-500`) and a `w-px` connector
(blue below done steps). Only the current step shows its description + one primary md CTA (`Go to Payments` / `Verify now` /
`Review` / `Opt in`); done = check + title, future = muted title. opt-in / agreement-pending prepend their own first step.

### STP agreement pending dialog — `STPState.openSetupStepsModal()` while `agreement_signature_pending`
Layout of Figma 36762:106435 (`ensurePendingDialog` in `stp-state.js`): same frame + card/terminal illustration as the opt-in
dialog, title "Waiting for the agreement signature." + description, a status card ("Waiting for Acknowledgement": Status `Pending
Signature` blue badge, Sent to, Email, Sent at; card footer only in test mode: note + "Open signer's link"), then the
"<signer> will receive an email…" text and small md buttons side by side: **Resend** (primary) + **Send to another person**
(secondary → inline first / last name + email form). No dialog footer. Steps 2–4 are not shown
until the agreement is signed; then the set-up steps list opens instead.

### Input with leading add-on (`$ 0.00`, Bank Account Verification)
`div.flex.items-center.rounded-md.bg-white.pl-3.outline-1.-outline-offset-1.outline-gray-300.has-[input:focus]:outline-2
has-[input:focus]:outline-blue-600 has-[input[aria-invalid=true]]:outline-red-500` > `span` add-on `text-sm text-gray-500` + bare
`input.min-w-0.grow.bg-transparent.py-2.pl-1.focus:outline-none` + optional error icon. Help text `text-sm text-gray-500` below;
info box `rounded-md bg-gray-50 p-3` with `type-title-small` + `list-disc type-description` bullets.

### STP walkthrough case instance (`?case=<id>`) — shell + data hooks
`SXDemoCase.applyPageConfig()` (inline on supplier-portal / payment-preferences, and from `shell-navigation.js` after a swap):
table `transformData` + `onMarkedPaid` (→ `markCardProcessed`), PP `transformSharedData` / `storagePrefix`.
Plan `sx-instance` (app-plans.js): Insights, AP/AR (Upgrade), SMART Exchange, Settings (open) › My Company Profile, Payment
Preferences, User Management; `hideShellExtras` drops Help + Account Information; the case business is the only switcher entry.
Links to dashboard pages keep `?case=` (click capture in sx-demo-case.js). `SXDemoCase.syncStp()` derives STP from the case.
Isolation: only a URL with this case's `?case=` is the instance (no sticky key); the plain portal is the general one.
The demo's STP state / agreement request (`stp-state.js` SCOPE) and table overrides (`EXCHANGES_TABLE_CONFIG.storageKey`)
live under `<key>:<case id>`, PP under `sxdemo_<id>_pp_`; Start enrolment clears only the previous case's keys.
Demo bar `#sx-demo-bar` (sx-demo-case.js, every page where `isPortalInstance()`): fixed bottom-right pill "Demo case <id>" +
xs secondary "New demo" (launcher: case information card + Start enrolment / Open Supplier Portal). Table defaults show Vendor Entry (= the case
business) and Date Initiated, as in the Figma STP table.

### SX enrolment Decline (`sx-enroll/*.html` before Submit)
Reuses SD's `OBDecline` (`onboarding-decline.js`, reasons `sd-decline.json`): sidebar card + `OB_MOBILE_MENU` item (not on
complete / declined / sign-agreement). Confirm → `declined.html` (Figma 38146:80118): red document-cross icon, "Payment was
Declined", Reason row in a bordered box; the reason is saved to the case as `enrol.declined`.

## Adding a component
1. Build every state (default, hover, focus-visible, active, disabled, error, loading; dark on dashboard).
2. Add a row/snippet here, and a note to `wiki/design-system/` when it is a product pattern.
3. If it exists in Figma SMART System, name it the same.
