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
