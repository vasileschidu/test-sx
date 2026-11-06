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
