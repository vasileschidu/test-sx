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
| Sidebar, collapsed rail | `nav-component.js`, `sidebar.js` | Figma R3 SX `46653:55707`. Panel `pl-6 pr-5.75` so the content column is 40px (border-r inside the right padding); every rail button `size-10 shrink-0 self-start p-0`, icon centred (nav items, SMART Exchange, Help, Account info). Submenus stay closed in the rail; the parent icon carries the active state |
| Attachment pills + "+N" | `payables-pay.js` `renderPillAttachments` / `fitAttachmentPills` (`#gp-pill-attachments`) | One row of pills (`rounded border-gray-200 bg-gray-100 py-0.5 pl-1 pr-2 text-sm font-medium`, name `truncate max-w-[220px]`, `title` = full name); what does not fit goes into a "+N" pill (same style) that opens an `el-menu` list (`px-4 py-2 text-sm`, dark `bg-gray-800`). Refits on resize (ResizeObserver); hide with `style.display` (the pills' `inline-flex` beats `hidden`). Each pill opens `#gp-review-dialog` alone (title = file name, subtitle `data-review-meta` "PDF · 66 KB", Download only): `review-modal.js` draws the PDF with pdf.js 3.11.174 (cdnjs) into `[data-review-pdf]` — white pages `shadow-sm ring-1 ring-black/5` on `bg-gray-50` (dark `bg-white/5`), no browser viewer chrome; real file via `data-review-src` (attachment `src` in the JSON) |
| Auth card (invite) | `invite/accept.html` + `um-accept.js` (`header()`, `screen()`) | Figma UM `qiy6GvUHQMhdbC7hkXCCyb` 271:111827: `bg-gray-50` page with two `bg-cubes.svg` (6% opacity, `dark:opacity-15`, hidden on phones), card `max-w-117 rounded-3xl bg-white shadow-lg ring-1 ring-black/5` (dark `gray-900` + `ring-white/10`); header `p-8 border-b` with `portal-logo-hex.svg` (72 slot) + `text-2xl/8 font-semibold` title; body `p-8 gap-6`; footer Powered by Transcard + Terms • Privacy. Steps: Initial Form → 6-box code (`fieldset min-w-0`, any code but 000000) → Choose a Business → You are in SMART Hub |
| Sidebar widths | `nav-component.js`, `sidebar.js`, `sidebar-boot.js`, `#main-content-wrapper lg:pl-[360px]` | SMART System `13387:5150`: expanded **360px** (24px padding → 312px content), collapsed rail **88px**; content offset follows (`lg:pl-[360px]` / `88px`). Change all of them together |
| Sidebar hover flyout | `sidebar.js` (`#dashboard-settings-flyout`, `openHoverFlyout`) | rail item with a submenu (Settings, SMART Exchange incl. its own page, Transcard Only) opens on hover, 4px right of the icon: `w-max min-w-56 px-1 py-2`, heading `mb-1 px-2 text-xs text-gray-500`, rows `h-10 rounded-md px-2 text-sm font-medium` — hover `bg-gray-50` (dark `bg-white/5`), current page `bg-gray-100` + `aria-current` (dark `bg-white/10`). Closes 200 ms after the pointer leaves; click pins it. Footer shield = card mode `gap-2 px-4 py-3`: "Powered by Transcard" + "Terms of Use • Privacy Policy" |
| Support Team card | `sidebar.js` `renderSupportFlyout` (Help trigger) | Figma `46660:60489`: `w-97`, header `p-6 gap-4` (48px `smart-hub-avatar.svg`, "SMART Hub Support Team" sm medium, email support@smart-hub.com and phone stacked, sm gray-500), Email / Call row (`py-3.5 text-base font-semibold gray-700`, 20px solid icons gray-500, `w-px` divider), with our FAQ & User Guides as a small blue link (sm semibold, micro external-link icon, new tab) under the phone in the header. Flips upward when it does not fit below |
| Theme (Appearance) | `theme-init.js` (`window.SXTheme.get()/set(mode)`), avatar menu in `topbar-component.js` | `localStorage.theme` = `system` \| `light` \| `dark` (no choice = light); System follows `prefers-color-scheme` live; `app-theme-change` `{isDark, mode}`. Menu row "Appearance" + current value (xs gray-500) + chevron-right; hover / click / ArrowLeft opens a submenu to the LEFT (own `popover="manual"`, `min-w-64 rounded-lg p-1`, dark `bg-gray-800` + white/10 ring): System default ("We'll match your system preferences") / Dark mode / Light mode, `menuitemradio`, blue check (blue-600 / dark blue-400) on the selected one. Picking applies at once; `?theme=` still works for testers |
| Badge | `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs/4 font-medium border` + colour | Figma SMART System `13387:1709` (Type Rounded/Square x Size Small/Large x 8 colours x Icon). Small 20px `text-xs/4`; Large 24px `text-sm/5`. Square = `rounded` (4px) instead of `rounded-full`; keep each badge's shape. Colour `border-{c}-200 bg-{c}-100 text-{c}-800 dark:border-{c}-400/20 dark:bg-{c}-400/10 dark:text-{c}-400`, c = gray (dark `border-white/15 bg-white/10 text-gray-300`) \| red \| blue \| indigo \| purple \| pink \| emerald (Figma Green) \| amber (Figma Yellow; never green/yellow/orange). Border, never `inset-ring`; never `rounded-[512px]`. Icon variant: `gap-0.5 py-0.5 pl-1 pr-2`. Covers statuses, tab/nav/filter count pills, "Me", "Exceptions", role chips. NOT badges: buttons, avatars, tooltips, bell unread dot, hero-card chips on dark surfaces. Builder: `badgeHtml` in `bills-payables-table.js` |
| Manage columns modal (rows) | `buildManageColumnsRowHTML` + drag handlers in `bills-payables-table.js`, `exchanges-table.js`, `consumer-exchanges-table.js` | Figma R2 AP `6200:139607`: row `rounded-lg p-2 hover:bg-gray-50` (dark `white/5`); drag = the row lifted as the drag image (`!bg-white shadow-lg ring-1 ring-gray-900/10`), then the row in place turns `opacity-40` until dragend; drop line `h-0.5 bg-blue-600` across the full row (`left-0 right-0`); "Exceptions" badge right after the label (checkbox not `flex-1`) |
| Table Export menu | `table-export.js` `TableExport.attach(button, { name, getData })` | Figma R3 SX `27072:70123`: wraps the toolbar Export button in `el-dropdown` + `el-menu` (`rounded-md py-1`, items `px-4 py-3 text-sm/5 font-medium`), open state = 2px white + 4px blue ring. CSV (UTF-8 BOM) / JSON in the browser, Excel (SheetJS) / PDF (jsPDF + autoTable) lazy from jsDelivr. `getData()` → `{ columns, rows, label, title }`: all filtered + sorted rows of the active tab, visible columns (Bills, SMART Exchange, Consumer Payments Received). Toast "Exported N rows as CSV." / error toast |
| Dark gray icons | `theme-init.js` (`GRAY500_ICONS` / `GRAY600_ICONS`, style `#dark-gray-icons`) | `<img>` SVG icons with gray-500 baked in get `filter: brightness(1.42) saturate(.6)` in dark (= gray-400), gray-600 ones `brightness(1.95) saturate(.5)`; inline SVG `fill`/`stroke` `#6B7280` / `#4B5563` → `var(--color-gray-400)`. New gray-500 icon asset → add its path to the list (or use inline SVG `currentColor` + `text-gray-500 dark:text-gray-400`). Light mode untouched |
| STP demo reset | `stp-state.js` | any page with `?stp=reset` drops the stored STP progression + agreement request → back to step 1 "Opt in" (banner + set-up steps); the param is removed from the URL |
| Shell glue | `shared.js` (load on every dashboard page) | tooltips (`data-tooltip="…"`, `data-tooltip-side`), focus/cursor rules, theme |
| Toast | `showGlobalTopToast(msg, { tone })` (`shared.js`) | dark pill, top centre, 3 s. `tone`: `"success"` (default, green check) · `"info"` (blue i, not-a-success outcomes) · `"error"` (red x-circle red-500 / dark red-400, `role="alert"`, e.g. file too large) |
| Page card | every dashboard page | white content card `rounded-lg bg-white shadow-sm dark:bg-gray-900` at **every** width (no `rounded-none sm:rounded-lg`), inside `main` with a phone gutter `p-2` (never `p-0`) |
| Top-bar user | `<app-topbar>` | in views with User Management (not the Consumer Portal, not the STP `?case=` instance): greeting, menu name / email and avatar (photo or UM initials) come from `localStorage.sx_um_v1` (`currentUserId`), else the company profile; "Profile" → `user-profile.html`. Re-renders on the `sx-um-change` event (UMStore writes) and `storage` |
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
| Copy value button | `OBModal.copyButton(label, value)`: 18px icon button, hover chip, "Copy"/"Copied" tooltip, green check; click handled by OBModal. Used by the Contact Us card (`copyRow`), SX card details (`sx-enroll-complete.js`) and the Pay page revealed account numbers (`setCopySlot` in `payables-pay.js`; page loads `onboarding-modal.js`). Don't build another copy button. |
| Schedule for later (Pay page) | Figma SH Sandbox `4364:163452`. Calendar button (size-8 gray, `data-tooltip`, blue `size-2.5` dot at -top-1 -right-1 (ring-2 white) when a date is set; open = outline-2 offset-2 blue) → menu `#pp-schedule-dropdown` (w-92, mt-1, rows px-4 py-2, hover gray-100, gray-200 separator): recommended rows Tomorrow morning / Monday morning / Due date with "Nov 16, 09:00 AM (ET)" (set one = gray-100 + semibold + emerald check; always three rows (plus a checked "Scheduled date" row on top when the set date is none of them): Tomorrow = tomorrow, Monday = the Monday after tomorrow; Due date disabled + "Overdue" when past), then "Choose another date" (blue) and "Cancel schedule" (red, only when set). "Choose another date" / the chip date open `#pp-schedule-dialog` "Schedule for Later" (sm:max-w-125): « ‹ Month › » nav (Figma Icon24 Angle / Angle-double shapes inline with currentColor, both chevrons full colour, not duotone), borderless grid, weeks start on Sunday (US), only this month's days (other slots empty), size-10 round days (hover gray-100, today blue semibold, selected blue-600, past days gray-300 disabled, size-1 dot on the due date); « ‹ disabled (opacity-40) when they'd go before the current month, two xs gray-500 lines under the grid, left-aligned: "● Due Tue, Dec 1, 2026 · in 18 days" (amber dot; Today amber / Overdue red) and, once a day is picked, "● Pays Fri, Nov 27, 2026 at 9:00 AM ET · 4 days early" (blue dot; early / On the due date emerald, N days late amber), gray-50 Schedule Timing box (9 AM ET), Recommended rows (same "Scheduled date" row on top when the set date is none of them; clicking it goes back to that date), Cancel / Select (text-sm px-3.5 py-2.5, same as the confirm modal; the × hovers as a rounded-md p-2 square like the month arrows) — "Change date" when a date is already set (disabled until a different valid day is picked). Hero row is `sm:items-start` so the amount lines up with Pay, not with Pay + chip. Set date = chip under the actions (`self-end`, also on phones) (Figma Button Group: white, shadow-xs, gray-300 dividers; gray-100 label part with 18px calendar + semibold gray-600 "Schedule for:" / "Due Date:" | semibold blue-600 "February 03, 2025" | 18px ×) (tooltip Cancel schedule). Footer has Pay + the same calendar button (dot mirrored); the menu moves there and opens upwards. Confirm modal button = "Schedule Payment". JS: `renderScheduleRecs`, `renderScheduleChip`, `renderScheduleCalendar`, `renderScheduleExtras`, `initScheduleDropdown`, `initFooterSchedule` in `payables-pay.js`. |
| Required fields on submit (Pay page) | Pay stays enabled (no disabled + tooltip). A click with something missing → `showPayRequiredErrors`: the el-select trigger gets `aria-invalid` (classes `aria-invalid:border-red-300 dark:aria-invalid:border-red-400/50`, focus ring red) + `aria-describedby` a `<p class="mt-2 text-sm/5 text-red-600 dark:text-red-400">` ("Select an origination account." / "Select a payment method." / "Complete the payment method details below."), and the page scrolls to the first one — no focus, so the red stroke stays visible. Errors clear as the fields get filled (`renderPayRequiredErrors` from `updatePayStepStates`). |
| Due date state (Pay page) | Figma SH Sandbox `4157:108844` (Past Due badge) + `4157:108789` (amber/red date + (!)). `renderDueState(row)`: overdue = DUE DATE red-600 + red exclamation-circle (`data-tooltip` "N days overdue") + `#gp-due-badge` red "Past Due" (rounded, pl-1 pr-2 text-sm/5, size-3.5 icon) next to the status badge; today = amber-700 + amber icon "Due today" + amber "Due Today" badge; ≤ 3 days = amber date + gray "in N days"; later = gray date + "in N days". Paid / in progress keep a plain date. `renderMethodEtaWarning`: amber note with warning icon under Method of Payment when ACH (3 business days) or Check (10 days) from today or the scheduled date lands after the due date. |
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

### Information circle + Tooltip (SMART System `PdvEp0MAIlof6O8MYaXCcy` 9352:21601, Size=Big, Bottom Text)
For a longer explanation next to a label (role descriptions in `um-invite.js`, Origination Account on `payables-pay.html`). Not the shell `data-tooltip` chip
(12px, centred, max 220px), which stays for short button labels.
- Wrapper `group/info relative inline-flex size-5 items-center justify-center`; trigger `span[tabindex=0][role=button]`
  with `aria-describedby`, Heroicons v2 mini `information-circle` at `size-4.5`, `text-gray-400 hover:text-gray-900`
  (dark `gray-500` → white); no outline on hover, focus-visible outline only.
- Tooltip `role="tooltip"`: `absolute top-full left-1/2 mt-3 -translate-x-2/5 w-max max-w-64 sm:max-w-[343px] rounded-lg
  bg-gray-900 p-3 text-sm/5 font-normal text-gray-100 text-left shadow-xs`, arrow `before:` 12px rotated square at
  `left-2/5`; shown by `group-hover/info` and `group-has-focus-visible/info` (invisible + opacity-0 otherwise);
  dark `bg-gray-950 ring-1 ring-white/10`. The 2/5 offset keeps it inside a dialog's left column.

### Buttons
- Secondary: `bg-white text-gray-900 font-semibold shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50`;
  sizes xs `rounded-sm px-2 py-1 text-xs` · sm `rounded-sm px-2 py-1 text-sm` · md `rounded-md px-2.5 py-1.5 text-sm`
  · lg `rounded-md px-3 py-2 text-sm` · xl `rounded-md px-3.5 py-2.5 text-sm`. With icon: `inline-flex items-center gap-1.5`.
  „Verify now"-style actions use **sm**.
- Link button (Add card / Add bank account / Filter / Download): `inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300` + size-4 icon, no background.
- Primary: `cursor-pointer rounded-md bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60`
  (dark disabled = muted dark blue + dimmed text; plain `blue-300` in dark looked brighter than the enabled button)
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
rows `p-4 gap-2` (description list) > optional footer `border-t px-4 py-3`. Status badges: see the **Badge** row (Completed = emerald, In Process = blue).

### Static link page + "link expired" (`sx-enroll/sign-agreement.html`)
Email-link pages without the step menu: `body.bg-white.lg:bg-gray-100` > white column `mx-auto max-w-5xl` > `main.max-w-148`
(hero from card-processing.html, `type-title-page` + `type-description`) + `<div data-ob-footer>` (SD footer, Powered by Transcard).
Document preview: scroll box `h-96 lg:h-150 overflow-y-auto rounded-lg border bg-gray-50 p-4` + `SXEnroll.agreementArticle()`
(Visa agreement, from `sx-enroll-acp.js`). Loading over a box/card: `relative` parent + `absolute inset-0 bg-white/70` with
`onboarding/loader.svg` `size-11 animate-spin` (`role="status"`), controls disabled. Invalid / used link: full-page `bg-gray-100`
centred `max-w-sm rounded-lg bg-white p-6 text-center` card, `size-12 rounded-full bg-red-50` + `icon-x-circle-red.svg`, `type-title-small`.

Toggle switch dark: track `dark:bg-white/5 dark:inset-ring-white/10 dark:outline-blue-500 dark:has-checked:bg-blue-500`.
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

### User Management list (`user-management.js`, Figma User Management 6.0–6.4)
Data `UMStore` (`um-store.js`): `load()`, `getUsers/getUser/getRoles/getRole/getCurrentUser/getBusiness`, `removeUser(id)`,
`setBusinessSetting(k, v)`, `onChange(fn)`, `reset()`; seed `src/data/user-management.json` (bump `version` + `SEED_VERSION`
to reseed), localStorage `sx_um_v1`.
- **Icon pill tabs** (own white card `p-4`): `role="tab"` buttons `group inline-flex gap-2 rounded-md px-3 py-2 type-label-large
  text-gray-600 hover:bg-gray-50 aria-selected:bg-gray-100 aria-selected:text-gray-900` (+ dark `white/5`·`white/10`), size-6
  outline icon `text-gray-400 group-aria-selected:text-blue-600`; arrow keys move between tabs.
- **Table → cards**: same rows twice — `table` in `hidden md:block`, `ul.divide-y md:hidden` cards. Header and row lines
  solid (no dashed). Pagination copied from `vendors-page.js`, right under the last row (`border-t`, no `mt`, last row
  `border-b-0`).
- **Sort header** (Andrian, 2026-11-10): Figma's double selector inline as two `<path>`s on currentColor (size-5). Idle:
  both halves `gray-400`, `group-hover:gray-600` (dark `gray-500`/`gray-300`). Sorted: the direction's half `blue-600`
  (dark `blue-400`), the other `gray-300` (dark `gray-600`), label `gray-900`/white. Click the upper arrow = asc, lower =
  desc, the active arrow again = off; click the label / keyboard = asc → desc → off. `aria-sort` on the `th`.
- **Pinned actions column** (Bills/Payables principle): scroller `data-table-scroll mx-4 sm:mx-6 overflow-x-auto` (margin,
  not padding, so the column pins at the card edge), table `min-w-4xl xl:min-w-0`. When it overflows, the action `th`/`td`
  (`data-action-column`, opaque bg incl. `group-hover`) get `sticky right-0 z-10` plus a `::before` edge gradient
  `right-full w-6 bg-linear-to-l from-black/5` (dark `from-black/20`). No divider line, and no box-shadow: a per-cell
  shadow fades at every row and shows seams.
- **Avatar**: photo `size-10 rounded-full object-cover`, else initials on a solid colour (`bg-purple-500`…) + white text.
- **Status pill with icon**: Badge (see Badge row) + size-3.5 icon — Active emerald check-circle,
  Inactive gray link-off, Pending amber clock. "Me" badge = blue Badge. User Management (table, Invite permissions, profile role) uses the Square type (`rounded`).
- **Row action button group**: `isolate inline-flex rounded-md shadow-xs` with 32px `inset-ring inset-ring-gray-300` buttons
  (`rounded-l-md` / `-ml-px rounded-r-md`), size-4 icons, `data-tooltip` "Edit Profile" / "Delete"; the owner row has edit only.
- **"+N" chip** `rounded-full bg-gray-100 px-1.5 type-label-small` → "Roles for: <b>name</b>" list dialog (full-height on phones).
- **Destructive confirm** = Vendors `vn-confirm-dialog` layout (X, centred size-11 red triangle, full-width red + bordered Cancel).
- **Business Details** (`business-details.html`, Settings › Business Details + switcher button): bordered header card (name
  `text-2xl` + Status / Created On / Business ID columns `sm:divide-x`, ID with `OBModal.copyButton` — load `onboarding-modal.js`),
  app cards (`rounded-md border-gray-300 p-4`, status pill Under Review blue / In Progress gray, "Go to Portal" ↗ link),
  settings row (text `max-w-md` + toggle + "Off/On" label).

### User profile (`user-profile.js`, Figma User Management 6.5–6.9)
Shared UM markup `UMUi` (`um-ui.js`): `avatar(user, {size, text})` (photo path / data URL or initials), `statusBadge`,
`fullName`, `roleNames`, `withViewer(href)`, `syncTopbar()` (Me's name / photo into `<app-topbar>` via `data-topbar-*`).
Store: `UMStore.getViewer()` (`?as=member` → View Only member, kept in sessionStorage `sx_um_viewer`), `updateUser(id, patch)`.
- **Avatar photo badges** (`relative` wrapper around a `size-20` avatar): upload `absolute -top-0.5 -right-0.5 size-6
  rounded-full bg-white ring-1 ring-gray-300` pencil → hidden `input[type=file]` (png/jpg ≤ 2 MB, resized to 256px data URL);
  remove `-right-0.5 -bottom-0.5` red trash, only when there is a photo → destructive confirm (Vendors `vn-confirm-dialog` copy).
- **Inline-edit row** (`dl.divide-y` > `div.sm:grid.sm:grid-cols-3.sm:min-h-22`): `dt` label | `dd sm:col-span-2` value + "Update"
  link (`type-link text-blue-600`). Update → `OBField.INPUT` (+ `errorIcon()`, `#<id>-error` with `OBField.ERROR_TEXT`, errors via
  `OBField.setError`) `sm:max-w-xs` + Cancel (secondary md) / Save (primary md) `sm:w-26`. One row at a time; Enter saves, Esc
  cancels, focus returns to Update. Read-only rows (Email) have no Update.
- **Member list view** (6.5): no Add New User; only the Me row has one `rounded-md` edit link "Edit my profile"; Me first.

### Invite flow (`um-invite.js`, `um-email.js`, `invite/accept.html`; Figma User Management 6.9i–6.13)
- `UMInvite.open({ email, onDone })` injects + opens "Invite Business Member" (wide two-column dialog, phone = full-height
  sheet): OBField inputs (leading icon = absolute size-5 svg + `pl-10`; read-only prefilled email `read-only:bg-gray-50`),
  Optional hint, `OBField.TEXTAREA` message, **role checkbox cards** (`label` card `rounded-lg border p-4 has-checked:border-blue-600
  has-checked:ring-1` + bare `<app-checkbox>` + name + **Information circle + Tooltip** (below) (click doesn't toggle) + `type-caption` apps),
  **permission accordion** (button `aria-expanded` + chevron `group-aria-expanded:rotate-90` + name + app caption; chips
  `rounded-full bg-gray-100 px-2.5 py-0.5 type-body`). Send = loading button (spinner + "Sending…").
- `UMInvite.showResult(inv, result, { resent })` = Vendors result dialog + green check; when the email wasn't sent: gray box with
  reason, read-only link field + `OBModal.copyButton` + "Open in email app" mailto.
- Dynamically inserted `<el-dialog>` initialises a tick later: open it on the next frame (`whenReady`), not right after insert.
- Status pills: Invitation Sent (blue, dashed circle), Expired (gray clock), Requires Action (amber triangle); placeholder avatar
  (Tailwind Plus gray person) and "-" name for rows without a name; "Send Invitation →" blue link button in the Role column.
- Row actions: Invitation Sent = resend + revoke; Expired = resend + remove; Requires Action = delete only (same 32px group).
- Accept page: standalone (logo, centred `max-w-lg` card); form = SX create-account fields/rules/eye + `<app-checkbox label>` terms
  with `error`; status cards (`size-12 rounded-full` tinted tile + `type-title-modal`) for expired / revoked / already / broken / done.
- Demo bar `#um-demo-bar` (pattern of `#sx-demo-bar`): fixed bottom-right pill, xs secondary buttons Simulate accept / Reset demo data.

### Roles (`um-roles.js`, Figma User Management 4. Roles, 7.01–7.13)
Store: `createRole / updateRole / deleteRole / getRoleUsage / isRoleNameTaken / roleApps`; permissions live in
`permissionCategories` (id, name, app, permissions[{ id, name, description }]). Table pieces shared with Users: `UMUi.table`
(`HEADER_CELL`, `CELL`, `GROUP_BUTTON`, icons, `sortHeader(key, label, sortKey, sortDir, attr)`, `nextSort(...)`,
`pagination({ page, pageSize, total, sizeId })`, `syncSticky(table)`).
- **Row actions with ⋮ menu** (7.11): `GROUP_BUTTON` edit + delete + `<el-dropdown>` ⋮ (`rounded-r-md`, `aria-expanded:outline-2`)
  with `el-menu` Edit / Duplicate / Delete (red). Description cell `line-clamp-2` + `title`.
- **Role form** (in-page card replacing the list): header title + **Select Preset** (`el-dropdown` text button, `aria-expanded:outline-2
  outline-blue-600`; menu rows with a blue check on the chosen one; label becomes "Preset: **Name**"); sections "Role Information"
  (OBField input `max-w-md` + textarea) and "Permissions"; footer Cancel / Create|Save **xl**, natural width.
- **Permission accordion with Select All** (7.02/7.09/7.13): header row `px-2 py-3` (open → `bg-gray-50 dark:bg-white/5`) = toggle
  button (chevron `group-aria-expanded:-rotate-90` + `text-base/6 font-medium` name + `type-caption` app) + `h-6 w-px` divider +
  links: none selected → **Select All** (blue); all → **Deselect All** (red); some → Select All + **Remove Selection** (red).
- **Permission chip** (toggle, 7.03/7.04): `button[aria-pressed] rounded-full py-0.5 pr-2.5 pl-2 type-body gap-1` — off: `bg-gray-100
  text-gray-700` + gray `+`; on: `bg-blue-100 text-blue-800` + blue `×` (dark `white/10` · `blue-400/15`); `data-tooltip` (dark
  chip, `data-tooltip-side="top"`) carries the permission description.
- **Role Created** (7.05) = the Vendors result dialog with green check; from the invite the Done button reads "Back to Invite".
- **Delete**: destructive confirm; a role in use turns it into "Role in Use" (amber triangle, blue **Show Users** → Users tab
  searched by role name).

## Adding a component
1. Build every state (default, hover, focus-visible, active, disabled, error, loading; dark on dashboard).
2. Add a row/snippet here, and a note to `wiki/design-system/` when it is a product pattern.
3. If it exists in Figma SMART System, name it the same.
