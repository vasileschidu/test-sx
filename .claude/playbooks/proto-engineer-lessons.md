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
