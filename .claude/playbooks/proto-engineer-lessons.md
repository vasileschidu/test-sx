# proto-engineer — lessons archive

Grep this file (`grep -n -i -A3 "<topic>"`); never read it whole. Append ≤ 3-line dated lessons, newest last.
Tags in brackets help grep: [sd] [tables] [shell] [tokens] [merge] [cache] [figma] [qa].

- 2026-10-07 [cache][sd] A page loaded `signature.js` without `?v=`; the browser kept the old copy that redirected to
  paywall.html → 404 after signing. The page now owns navigation + loads `signature.js?v=…`. Always version changed scripts.
- 2026-10-09 [cache][sd] „Submit Code does nothing" = cached `confirm-identity.js` from another branch. Fix: `?v=` tag + `tools/serve.py`.
- 2026-10-09 [merge] Vlad's Prettier commit was reverted on main then built upon in his branch → merging needed
  revert-of-revert or prettier-normalised 3-way merges. Format base/theirs with Prettier defaults before `git merge-file`.
- 2026-10-09 [merge] Vlad's branch carried an outdated `payment-program-configuration.html` (missing bulk-assign markup →
  `bindBulk` null error). Smoke every page after a merge, not just the conflicted ones.
- 2026-10-14 [shell][tokens] Consumer Portal logo stretched: SVG exported with `preserveAspectRatio="none"` and a non-square viewBox
  in a square slot. Fix the asset (square viewBox), not the CSS.
- 2026-10-19 [tokens] New classes from `design-tokens.js` are additive: proved with 22 before/after screenshots (pixel-identical).
  Use `pixel-compare.mjs` for any token or refactor change.
- 2026-10-19 [tokens] Tailwind theme namespaces `--text-color-*`, `--background-color-*`, `--border-color-*` give `text-*`/`bg-*`/`border-*`
  utilities without clashing with font sizes (`text-base` stays a size). Don't name colours `base`.
- 2026-10-20 [sd] Andrian owns the SD step transitions (instant step changes + loading skeletons on token values).
  Don't reintroduce page fades; coordinate before touching `onboarding-transitions.js`.
- 2026-10-26 [merge] Vlad's `tailwind-theme.js` and `design-tokens.js` both insert after the Tailwind CDN tag: order is theme → tokens.
- 2026-11-05 [exchanges-table] A pending **Card** row with no review/signature is "Pending Your Action" and lives on the
  Action Required tab, not Pending — deep-link with `&tab=action-required` or the table looks empty.
- 2026-11-05 [app-plans] Extra tenants (e.g. `sx-demo`) can only read globals loaded before `app-plans.js`; load `sx-demo-case.js` first.
- 2026-11-05 [sd][sx-enroll] Reusing the SD shell in another flow: `OB_FLOW_STEPS` + `OB_MOBILE_MENU` before sidebar/stepper,
  a tiny `SDOnboardingContext` adapter (getState/saveState) and an `OBGo` wrapper for hard-coded hops — no SD file edited.
- 2026-11-05 [qa] code-audit skips untracked files' lines (git diff is empty): run new files with `--all-lines`. Pages that need
  localStorage state: `--init tools/ui-qa/init/<seed>.js` (added to code-audit and hover-audit).
- 2026-11-05 [qa] hover-audit flags the SD stepper's completed steps (no hover by design in onboarding-stepper.js) — not a defect.
- 2026-11-05 [stp][worker] The token worker's `buildAgreementUrl` wipes `search`/`hash` of `verifyBaseUrl`: route links by
  page path (`sendAgreementEmail({ linkUrl })`) and resolve state on the landing page (same-browser localStorage), not by query.
- 2026-11-05 [stp] `STPState.setStpStep(non-pending)` clears the agreement request unless it is `status: "signed"`
  (`markAgreementSigned` before the step change). Cross-tab tests: one Playwright context = shared storage + storage events.
- 2026-11-05 [payment-preferences] `normalizeCards` throws (deriveCardBrand is in another IIFE), so the default page always shows
  `generateFallbackCards` from `.catch`; a page that supplies its own cards must bypass it (see `transformSharedData` branch).
- 2026-11-05 [app-checkbox] data-* attributes move to the inner `<input>`: query `[data-x]` gets the input (click it in tests).
- 2026-11-05 [shell-navigation] SPA swaps don't run inline `<script>`s: per-page config must also be applied in `configurePage`.

- 2026-11-06 [dark-mode] Tailwind `dark:` follows the OS unless the page has `@custom-variant dark (&:where(.dark, .dark *))`; `?theme=dark|light` in theme-init.js switches pages without a menu.
- 2026-11-06 [dark-mode] Bulk hex→class + `dark:` pair via a script: parse variants incl. `data-[x]:`/`aria-[x]:` (else the pair loses its variant), skip a token whose segment already has a `dark:` pair, and prove light with pixel-compare. pixel-compare has no init script: SX pages need a custom capture that adds `tools/ui-qa/init/sx-demo-case.js`.
- 2026-11-06 [dark-mode] `classList.add/toggle/remove('a dark:b')` throws (InvalidCharacterError) — one token per argument; a bulk class->pair rewrite of JS strings breaks these (onboarding-multi-party.js:712, -decline.js, -sign.js). Grep `classList\.\w+\('[^']* ` after a bulk pass.
- 2026-11-06 [dark-mode] bg-white rule: on an element that also has border/outline/inset-ring (buttons, inputs) -> dark:bg-white/5, else surface -> dark:bg-gray-900; outer frame lg:bg-gray-200 -> dark:lg:bg-gray-950 (works). No PIL on this Mac: build contact sheets with pngjs.
- 2026-11-06 [dark-mode] Token-level dm script (tokenise on whitespace/quotes, add `dark:<variant>:<pair>` after each mapped class) converted 494 classes in 15 pages light-identical. Dashed/white receipt SVGs (`receipt-line`, `receipt-edge`) need `dark:opacity-10/30`, canvas strokeStyle needs a `.dark` check in JS.
- 2026-11-06 [parallel-agents] Another agent's `git stash` silently reverts everyone's working files: if a screenshot looks un-converted, check `git stash list` and wait for the pop before re-editing. Use `--out <dir>` on pixel-compare so parallel batches don't share captures.
- 2026-11-06 [dark-mode] A hex/class→dark: bulk script must skip tokens whose variant chain already contains `dark:` (else `dark:dark:text-…`), and `classList.toggle/add("a dark:b")` with a space throws InvalidCharacterError — split into two calls. Grep both after every bulk run.
- 2026-11-06 [dark-mode] `inset-ring-gray-300` (secondary buttons) needs `dark:inset-ring-white/10`; green status badges/banners `bg-green-50`→`dark:bg-green-500/10` + `text-green-700`→`dark:text-green-400`.
- 2026-11-06 [dark-mode] Scratchpad is shared by parallel agents: don't reuse/rely on a helper (conv.py) between runs — copy it to a private name first. First-run pixel "before" of a page can differ from a later baseline of the same code (flake): re-capture a baseline before blaming the change.
- 2026-11-10 [shell][user-management] A new dashboard page needs 4 shell edits: nav.json + app-plans (href, `moduleForPage`),
  nav-component (`APP_NAV_PAGE_MAP` + fallback NAV), topbar (breadcrumb + title maps). Pages outside shell-navigation's
  PAGE_CONFIGS just do a full load — no SPA config needed.
- 2026-11-10 [modal][a11y] el-dialog restores focus to its trigger on close; if the action removed that row, focus the
  next target in the dialog's `close` event (setTimeout 0), not right after `dialog.close()`.
- 2026-11-10 [qa] `clipped-text-no-tooltip` on `p.min-w-0.truncate` @390 on every dashboard page = topbar greeting; fixed with a title.
- 2026-11-10 [figma][user-management] Built without Figma once and had to redo tabs, badges, actions and a whole page: if no
  Figma screenshot is reachable, ask the coordinator for PNGs before building, don't infer layout from a text brief.
- 2026-11-10 [user-management][store] A store that re-syncs a field from another source on every load (UMStore.syncCurrentUser
  ← company profile) silently undoes local edits: mark locally edited records (`nameEdited`) and skip the sync for them.
- 2026-11-10 [shell][topbar] Page-level top-bar updates: name hooks are `data-topbar-greeting-name|profile-name|avatar-initials`;
  the avatar `<img>` has no hook (`button[aria-label="Open user menu"] img`); the topbar's own fill runs first on the same promise.
- 2026-11-10 [modal][tailwind-plus] A `<el-dialog>` inserted by JS upgrades a tick later and closes its `<dialog>`: `showModal()`
  right after insertion silently does nothing. Open on the next frame (rAF + setTimeout 0) the first time.
- 2026-11-10 [user-management][test] E2E tests that look for a new row must widen the page size first (the row may land on page 2).
- 2026-11-11 [modal][tailwind-plus] `el-dialog.close()` animates out and the page stays inert until the `close` event: open the
  next screen (or focus a field) in that event, else typing and focus silently go nowhere.
- 2026-11-11 [checkbox] `<app-checkbox>` moves `data-*` onto its inner input: query `input[data-x]`, not `[data-x] input`.
- 2026-11-11 [refactor][qa] Prove a shared-helper extraction with request interception: `page.route(/file\.js(\?|$)/)` serving
  `git show HEAD:` copies, then compare the rendered HTML. Globs like `**/x.js*` also catch `x.json`.
- 2026-11-11 [shell][topbar] Cross-module data in the shared top bar: read the other module's localStorage directly (try/catch,
  fallback to today), gate it by plan (`AppPlans.visibleModules()` nav children), and re-render on a custom event + `storage`.
- 2026-11-11 [qa] Is a major pre-existing? Copy `git show HEAD:<page>` to a temp page next to it, audit, delete it.
- 2026-11-11 [cards] Rounding phone cards also needs the `main` gutter: `p-0 sm:p-2` pages put the rounded corners on the screen edge.
- 2026-11-13 [badges] Badge = Figma `13387:1709`: `gap-1 rounded(-full) px-2 py-0.5 text-xs/4|text-sm/5 font-medium border` + `{c}-100/200/800` (dark `{c}-400/10|20|400`); green->emerald, yellow->amber. Bulk-convert with a run-regex over `[^"'`<>]+` (not quoted strings: JS concat breaks quote pairing) and review the dry-run diff; clock/icon-left badges keep `gap-0.5 py-0.5 pl-1 pr-2`.
- 2026-11-13 [qa] `qa:code --pages` needs full paths (`src/pages/dashboard/x.html`), not page names; a stuck Chrome launch/page.goto timeout is transient: re-run in background.
- 2026-11-13 Reveal/Hide Details icons: one canonical pair (payables-pay.html #pp-orig-bank-reveal-btn, Figma 11832:1410). In JS wrappers (<span data-icon>) strip data-icon/hidden from the inner svg, else the hide svg stays hidden; 'aria-hidden' makes a naive 'hidden' replace match.

- 2026-11-16 Bulk class edits on JS string builders: a regex on `class="..."` also matches `class="' + OBField.INPUT + '"` (empty class, mismatched quotes) and injects classes into the concatenation. Require equal open/close quotes and skip empty class; constants (INPUT_CLASS) need their own edit. Exclude `.history/` (tracked) from file globs.
- 2026-11-20 [tables][filter] Column header filters: `ColumnFilter` (column-filter.js) writes the table's *applied* filter state, then
  `copyAppliedFiltersToDraft()` + the table's re-render path, so global panel/chips/count follow. A new table script must also go into
  shell-navigation `PAGE_CONFIGS.scripts` (SPA swaps only load listed scripts) — bump shell-navigation's ?v= on every page.
- 2026-11-20 [qa] Tools default to :8899; in a worktree on another port run them with `SX_BASE=http://localhost:<port>`. Calendar days re-render
  on hover/click: doc-level click handlers must ignore `!event.target.isConnected`, Playwright must use locators, not element handles.
- 2026-11-20 [filter] Andrian on table dropdowns: no title/eyebrow, footer = the global filter's Reset + Apply (draft until Apply),
  inputs copied from existing fields (toolbar search, global From/To) — never a restyled "compact" variant.
- 2026-11-20 [filter] "Columns that had a filter icon" = what the header *rendered* on main (Bills: Payee, Source), not every case
  the click handler accepted (it also listed status/method/…). Ask before widening a UI to "every" column.

- 2026-11-18 [cards-manager list] No Node: drive headless Chrome over CDP (`--remote-debugging-port`, raw websocket from python stdlib: Page.navigate, Runtime.evaluate, Input.dispatchKeyEvent, Page.captureScreenshot). Key events go to the focused element: focus it first or Esc looks broken.
- 2026-11-18 [tables] Don't set fixed column widths in a new table inside a ~870px card: `min-w-max` + `w-44/52/32` pushed the last column off-screen at 1280; let the table size to content. A `fixed` popover escapes the mount's `overflow-hidden`.
- 2026-11-18 [cards-manager details] `el.click()` from CDP does not open an `el-dropdown`: send real `Input.dispatchMouseEvent` (moved/pressed/released) at the button centre; after that ArrowDown/Enter/Esc work on the `el-menu` and Esc returns focus to the trigger. Sub-state kept in a page-owned `?view=` param (pushState) is safe when the shell's `navigate()` rebuilds the URL from scratch and its popstate re-emits `route`.
- 2026-11-18 [mobile headers] A `flex-wrap` header with `flex-1 min-w-0` title never wraps (the title just truncates to "Co…"): give the title group `min-w-60` so the buttons drop to the next row.
- 2026-11-18 [cards-manager details] Rework after rejection: when Figma screenshots exist, read them BEFORE the first draft; I had invented section titles, a Gray reveal button and pill tabs. Scripts that use `PPComponents` at render time must redraw on `window.load` (the defer order vs the data fetch is a race).
- 2026-11-18 [dialogs from menus] OBModal restores focus to the element focused when it opened; after an `el-menu` item click that is `body`. Focus the trigger first, and after a redraw focus the NEW trigger (the old one is detached). CDP Enter on a button needs `text:'\r'` in dispatchKeyEvent.
- 2026-11-18 [dialogs with app-checkbox] `<app-checkbox>` absorbs its children only when connected: to change the sentence (e.g. after a picker choice) re-render the element with the old `checked`, do not edit its innerHTML. A flow that redraws the page behind a dialog must focus a surviving element (e.g. Back arrow) BEFORE opening the next dialog so OBModal returns focus there.
- 2026-11-18 [string-builder edits] After a Python `replace` inside a JS string concat, re-check the quote type at the end of the line: one stray `'` killed the whole script silently (only `Runtime.exceptionThrown` showed it). In CDP tests, clicking an `el-option` that is scrolled out of the popover hits the modal backdrop and closes the dialog: pick a visible option.
- 2026-11-18 [show/hide with display utilities] A `hidden` class on an element that also has `inline-flex` (every Button class) does NOT hide it: use the `hidden` attribute (preflight `[hidden]` is !important). Also: two stories sharing a page must not reuse `data-*` hook names (the list's `[data-cm-filter-apply]` was matched first by `document.querySelector` in tests): prefix per story (`data-bh-*`).
- 2026-11-18 [tab panels re-created by the host] When the host script rebuilds the panel on every redraw (no event for data-change redraws), the child script must look the panel up again on `details-tab` / `route` / `data-change` and draw only if `!panel.firstElementChild`; keep state in a per-card object, not in the DOM. An expanded row inside a scrolling `min-w-max` table needs a `sticky left-0` wrapper sized by JS to the scroller width, or it scrolls away.
- 2026-11-18 [no node on this machine] `node --check` / `qa:code` are unavailable: syntax errors only show as `Runtime.exceptionThrown` in a CDP run; headless screenshots at 1280x1250 dark can come out blank (re-shoot at 1100 high).
- 2026-11-18 [dialog motion] Never fade a parent that also holds the panel (double opacity): backdrop = separate `fixed inset-0` scrim child, panel `relative` sibling. Hand-rolled dialogs copy the el-dialog classes via data-closed/data-enter/data-leave toggled over 2 rAFs; leave node gets pointer-events-none + removed after 200ms, state/focus/scroll released at once.
- 2026-11-18 [dialog chaining] A dialog opened while the previous one is still leaving must drop the old node and skip the backdrop fade (else the page un-dims for 300ms); only the panel animates.
- 2026-11-18 [native <dialog> in JS] `gp-bank-validation-dialog` / `pp-bank-validation-dialog` (createElement('dialog')) still open without motion: convert to el-dialog if touched.
- 2026-11-18 [dialog X] Every modal X = the Decline Payment button (p-1 rounded-md, 20px stroke-1.5 svg, gray-400, gray-100 hover); `OBModal.closeButton()` renders it, SD pages keep the Figma X. Normalise by a script over `<button>` blocks, never by hand-editing 90 places; `sed -i` on macOS needs `-i ''` (a failed sed aborted my filter and the script rewrote SD-only files: always `git status` after a bulk apply).
- 2026-11-18 [JS-built native dialog -> el-dialog] Create `<el-dialog><dialog>…<el-dialog-panel data-x-panel>` and write state HTML into the panel (keep `d` = the <dialog> for showModal/close/cancel hooks).
- 2026-11-18 [dismiss X sweep] "Every modal X" means every dismiss X: also toasts (CSS in shared.js / exchanges-table.js / consumer-exchanges-table.js), the Notifications slide-over, the mobile sidebar. Enumerate with a CDP sweep (every dialog showModal + bell + toast + menu + filters, real hover) instead of grepping; run 4 configs in parallel with `CDPPORT` + per-port profile.
- 2026-11-18 [chrome headless] el-dialog created via JS and opened in the same tick gets closed again by its upgrade: create it up front.
- 2026-11-18 (hover-audit, sort header): `no-hover` on Bills-style two-tone sort headers is a false positive: SNAP reads the `<svg>`, the hover tint is on its `<path>`s. Check the path colour by hand before "fixing" the spec.
- 2026-11-18 (Cards Manager, card-manager-linked.js): a story allowed only its own script tag loads missing shared helpers (TableUi, DateRangeCalendar, PPComponents) once from the script (window global or existing tag first, same `?v=`); swap for page tags when the page gets them.
- 2026-11-18 [qa][modal] Audit a JS-opened dialog with `--init <file>` (open it on `load` after `CardManager.ready`) + `--scope "[data-ob-modal-dialog]"`; hover-audit `no-hover` on an outline-only select trigger is a false positive (SNAP skips `outlineColor`) — check it by hand.
- 2026-11-18 [modal][el-select] OBModal closes on any Esc at `document`: an `el-select` inside needs a capture listener on the backdrop that notes `el-options:popover-open` and stops the bubbling Esc, else Esc in the list closes the dialog.
- 2026-11-18 (Cards Manager S14, shared `details` mount): two stories drawing into one mount without editing the first: register later (tag after) and redraw on the same events (`route`/`data-change`/`ready`/`load`), prefix hooks so the other click handlers ignore yours; a shared helper looked up as `H.fn()` at call time (CardManagerHistory.findCard) can be wrapped to feed it your data.
- 2026-11-18 (qa, card visual): `bg-[#142435]` (Figma Card_VC navy, S2/S3/consumer) is a code-audit MAJOR with no token to swap to: needs a Figma token first; report it, do not dodge the regex.
- 2026-11-23 [qa][smart-enroll] hover-audit compares bg/colour/border/shadow/outline-*style*, not outline colour: a select trigger with only
  `hover:outline-gray-400` reads as no-hover (give the chevron a `group-hover` tone). Text colour set only on an inner span → dark-low-contrast 1.2: colour the button.
- 2026-11-23 [tokens][smart-enroll] Progress bars stay class-only with Tailwind v4 fractions (`w-37/100`, browser build generates them); no inline width.
  A `sr-only` skip link at the start of `<body>` is flagged controls-overlap at 390 against a top-left menu button.
- 2026-11-24 [smart-enroll][tooltip] A reason tooltip on a "disabled" button: use `aria-disabled="true"` + `data-tooltip` (Tailwind `aria-disabled:` variants, add `aria-disabled:hover:` too), not `disabled` — it stays focusable and the tooltip shows on hover and focus; guard the click in JS.
- 2026-11-24 [um-store] A role that belongs to one app gets `scope` in the seed and is hidden by `getRoles()`; bump SEED_VERSION + json `version` and every page's `um-store.js?v=` (5 pages load it). macOS `sed -i` needs `''` — use python for edits.

- 2026-11-24 [smart-enroll][qa] A page-wide horizontal overflow with no element past the viewport = an `sr-only` (absolute) child inside a scroll container that is not `relative` (tab status text in the tablist): add `relative` to the container. Audit a state-dependent tab with `--init tools/ui-qa/init/<seed>.js` and a `?tab=` page URL; run qa with `SX_BASE=http://localhost:<port>` on a non-default port.
- 2026-11-24 [forms] A grid trigger with `truncate` content needs `grid-cols-[minmax(0,1fr)]` (not `grid-cols-1`) + `min-w-0`, else the selected text widens the column; give the button a `title` for the clipped text.
- 2026-11-24 [layout][smart-enroll] A `<fieldset>` is min-width: min-content: a list of `truncate` cards inside it overflows a 375 phone. Give it `min-w-0`.
- 2026-11-24 [qa][smart-enroll] QA a multi-step single page by passing `page.html?step=N` in `--pages` plus an `--init` seed that marks the steps
  reached (`tools/ui-qa/init/smart-enroll-sign-up.js`). OBConsents outside SD: define a tiny `window.SDOnboardingContext` on the page state.
- 2026-11-24 [layout][smart-enroll] `body.h-full` + `pb-*` doesn't add scroll room (content overflows the body box): a fixed demo bar then covers the
  last control (hover-audit "covered"). Use `min-h-full` on body. code-audit still flags fixed overlays vs content at scroll 0: scope it (`--scope "#se-main"`).
- 2026-11-24 [smart-enroll] Gate the shell's Next Step from a tab without editing shell.js: `document` click listener in capture phase + stopPropagation; `rerender()` reuses the body element — bind its listeners once (data flag).
- 2026-11-24 [qa][smart-enroll] hover-audit counts buttons inside a closed `<details>` as no-hover: build the list on `toggle` (empty when closed).
  A full-screen layer over the page leaves the page links "covered": add `hidden` to the page wrapper while the layer is open.
- 2026-11-24 [worktree][git] Isolated agents: `git show a:b`, `for … git …` and multi-branch loops are refused; one plain `git grep -h -o "<re>" <ref1> <ref2> -- <path>` reads a file across branches (e.g. next free DS-number).
- 2026-11-24 [smart-enroll][forms] Two hidden-toggled variants of one form (Individual / Legal) that share field keys (zip, city…) need scoped ids
  (`<owner>-<variant>-<key>`) and a `data-*-field` wrapper per field; find the visible one with `!el.closest("[hidden]")`.
- 2026-11-24 [qa][smart-enroll] Audits only see the initial DOM: seed + auto-open with an `--init` file (`tools/ui-qa/init/se-ownership.js`). Long tabs show the
  shell's fixed `#se-demo-bar` covering the footer "Next" button (controls-overlap / covered) — a T1 shell finding, not the tab's.
- 2026-11-24 [tables][smart-enroll] `sr-only` spans (absolute) inside an `overflow-x-auto` table wrapper escape it and widen the page on phones unless the wrapper is `relative`.
- 2026-11-24 [dialogs][OBModal] OBModal's Tab trap takes the last `<button>` even when disabled (Continue/Save before a choice) → Tab leaves the dialog. Add a backdrop keydown guard that filters `:disabled` (connectors.js `guardTrap`); fixing OBModal itself would cover every product.
- 2026-11-24 [qa][dialogs] code-audit / hover-audit only see the page's first state: add a `?<tab>=demo` seed for table states and sweep dialogs with a small Playwright script (hover in dark, 30×Tab trap, Esc). Fieldset-disabled buttons match `:disabled`, not `.disabled`.
- 2026-11-24 [forms][smart-enroll] Two fields side by side whose labels wrap differently: make each field a `md:row-span-2 md:grid md:grid-rows-subgrid md:gap-y-1` (label `self-end` | field + error in one cell); a 3-row subgrid with the error as its own row left a double gap.
- 2026-11-24 [qa][smart-enroll] An add-on that adds a tab pushes a status-icon tab past 390px: the shell tablist (`overflow-x-auto`, not `relative`) lets its `sr-only` "(complete)" escape → page overflow 424px. T1 fix, reproduce with a seed where Connectors is complete.
- 2026-11-24 [worktree agents] Bash refuses `for`/`&&` chains that write into the scratchpad with heredocs + run node: write the test script with Write, then run `node <abs path>` alone.
- 2026-11-24 [smart-enroll][forms] Re-rendering a tab with `innerHTML` while a field has focus fires its `blur`/`change` mid-render ("node to be removed is no longer a child"): guard the render with a re-entrancy flag. OBModal has no close callback: watch `[data-leave]` / disconnect with a MutationObserver to sync the page (e.g. revert a radio on Cancel).
- 2026-11-24 [qa][elements] `el-autocomplete` (Tailwind Plus Elements) works as a filtering combobox: `<input>` + `el-options` (`w-(--input-width)`), options `aria-selected:`; listen to the input's `change`. A fresh worktree needs a `node_modules` symlink to the main checkout for the QA tools (playwright-core).
- 2026-11-24 [discrepancies] Parallel agents all take "next free" DS-number (seven DS-008s on 2026-11-24): grep the sibling worktrees' discrepancies.md first and take a free block.
- 2026-11-24 [smart-enroll][demo controls] A demo switcher goes in the page flow (Enroll: `[data-se-demo]` under the status box, so it is in the drawer too), never a `fixed` bar: that bar caused every "covered"/controls-overlap finding on 6 tabs.
- 2026-11-24 [dialogs][OBModal] Trap fixed in `onboarding-modal.js` (keydown-time list, skips disabled/hidden/tabindex=-1/unchecked radios); local `guardTrap` workarounds are gone. Spot-check a shared-script change by injecting `OBModal.open(...)` with a disabled last button on one SD, one sx-enroll, one Hub page.
- 2026-11-24 [qa][consistency] Baseline numbers without stash: `git worktree add --detach <scratchpad>/base HEAD` + node_modules link, run the tool there, then `git worktree remove --force`.
- 2026-11-24 [smart-enroll][storage] A demo link opened with `target=_blank rel=noopener` gets an empty sessionStorage: state the other tab must read (signer request) goes in localStorage, and the first tab follows with `window` `storage` events (fires only in the *other* tabs). Persist the outcome through the shell (setStatus → sessionStorage) so a reload keeps it.
- 2026-11-24 [dialogs][OBModal] Figma "second dialog over the first" (Provide additional details over Submit): OBModal is one dialog at a time — swap header/body/footer in place (connectors `wideDialog` pattern), Cancel re-renders the step from saved state (reverts the radio). Log it as a DS row.
- 2026-11-24 [qa][dialogs] Modal sweep script (`hover` each control, dark bg luminance, 30×Tab, Esc, radius 8px): run with `reducedMotion: "reduce"` so OBModal closes instantly; the blue primary `dark:hover:bg-blue-400` trips a naive "light hover" luminance check — that's the accepted Tailwind dark primary.
- 2026-11-25 [figma][smart-enroll] Master component sets in a second file ("SE (In Progress)") can be older than the R1 frame the PO points at
  (blue vs amber status box, Added=On border): follow the given frame, log the drift (DS-037). Without use_figma, `get_design_context` on a
  component SET returns every variant's classes in one call — cheapest way to read Default/Hover/Focus fills.
- 2026-11-25 [assets][figma] Off-palette Figma gradients (Gradient/Add-on/*) → build a small SVG asset (gradient circle + downloaded white logomark),
  never arbitrary hex classes. A Figma "24/32 title" check: `get_metadata` text box height (36 = 30/36, 40 = 36/40) before changing classes.
