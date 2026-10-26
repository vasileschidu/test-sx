---
name: sandbox-render
description: Serve the test-sx sandbox locally without caching and render any page at an exact viewport (375/768/1280…) to take screenshots, click elements and measure element boxes. Use for verifying sandbox changes and for Figma-vs-sandbox comparisons.
---

# Render and measure the sandbox

## 1. Serve (no cache)

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8091/index.html \
  || (python3 .claude/skills/sandbox-render/scripts/serve.py "$(pwd)" 8091 >/dev/null 2>&1 &)
```

Run it from the repo root. Pages live at `http://127.0.0.1:8091/src/pages/onboarding/<page>.html`.
If the user reports something "missing" that you see working, suspect their browser cache first. When you change
shared scripts, bump `?v=` on them, per repo convention.

## 2. Render

```bash
node .claude/skills/sandbox-render/scripts/render.mjs --url "http://127.0.0.1:8091/src/pages/onboarding/index.html" \
  --w 375 --h 812 --out /path/in/scratchpad/welcome-375.png
```

- **Standard sizes:** 375×812 (phone), 768×1024 (tablet), 1280×900 (desktop).
- `--click "[data-ob-menu-open]"` opens UI before the screenshot (menus, dialogs).
- `--eval "<expr>"` prints JSON, e.g. element boxes:
  `--eval "JSON.stringify([...document.querySelectorAll('section[data-ob-tone] *')].slice(0,5).map(e=>{const b=e.getBoundingClientRect();return [e.tagName,b.x,b.y,b.width,b.height].map(v=>typeof v==='number'?Math.round(v):v)}))"`
- Markup inserted by `--eval` (e.g. `OBSign.open()`) has no Tailwind styles until the CDN's observer runs: return `new Promise(r=>setTimeout(r,800)).then(()=>…)` and measure inside it, or you get unstyled boxes (a 24px-tall button).
- `--full` captures the whole page height (it resizes after `--eval`, so measure first).
- `--element "<selector>"` captures one element at 2×.
- `--pre "<js>"` runs on the seed page before the target loads, e.g. `SDOnboardingContext.saveState({debitCard:{…}})` for summary/submitted pages that redirect without earlier steps' data. Use capitalised brand values ('Mastercard'/'Visa'), state 'Texas' and country 'United States'.
- Summary / Submitted pages need the earlier steps' state. One `--pre` that covers all of them: `SDOnboardingContext.saveState({virtualCard:P, checkRequest:P, debitAccountInfo:P, bankAccountInfo:P, debitCard:{brand:'Mastercard',number:'5555555555554444',month:'12',year:'28',name:'Rachel Morris'}, bankAccount:{accountType:'checking',holder:'Rachel Morris',routing:'021000021',account:'000123456789'}})` with `P = {firstName, lastName, dob, ssn, address1, city, state:'Texas', zip, phone, email}`. Runs with `--seed` sometimes still redirect (state race): re-run before measuring. Closed screens: `revokedReason` → payment-closed.html; `declined:{reason,note}` → declined.html.
- Default wait is 6000 ms. Pages may show skeletons earlier; use `--wait 9000` for the debit/bank pages.
- A run prints `REDIRECTED: …` on stderr if the page ended up elsewhere. Never report measurements from a redirected run.
- Each run takes a free port, so parallel runs are safe. Still keep to about 3 at a time on a busy machine, and re-render before reporting an empty or odd result.
- `confirm-identity.html` picks email or phone at random: add `?channel=email` or `?channel=phone`.
- Save outputs in the session scratchpad, never in the repo.
- Read the PNG with the Read tool to look at it.

Don't use plain `chrome --headless --window-size=375,…`: it renders at about 500px and crops, so every page looks broken.
Pass sizes explicitly per call; in zsh, `set -- $w` does not word-split.

## 3. Demo state

Many pages read the demo state from `localStorage` (`sd-onboarding-context.js`, `onboarding-flow.js`).
A fresh headless profile has no state, so some pages show defaults or redirect.
- `?flow=multi-party` starts a Multi-Party demo. Pass `--seed "http://127.0.0.1:8091/src/pages/onboarding/index.html?flow=multi-party"` to render.mjs to load that state before the target page in the same run.
- If a page looks wrong only in headless, say so in your report instead of "fixing" it. On 2026-10-21, Allocation showed no top bar in headless.

## 4. Measuring against Figma

Compare the same things on both sides: frame-relative x/y/width/height of key elements, and font size/weight.
Report the differences as a table: element | Figma | sandbox | Δ.
Figma desktop frames are **1728 wide**. Render the desktop at 1728×1024, or compare boxes relative to a shared element such as the card, not to the viewport.
`?flow=multi-party` seeds the demo only on the entry page; on inner pages (e.g. payment-status.html) it is dropped.
Figma Text Area instances include their label (20 + 4); subtract it before comparing with a CSS textarea. Some desktop frames keep a hidden Back button at opacity 0 as a spacer, so check opacity before calling a button missing. (t) frames keep the phone CTA y, like the footer gap: compare tablet CTA gaps with the desktop frame.
Figma strokes `OUTSIDE` take no layout space. A CSS `border` does, so the equivalent is `ring-*`.
Two `flex-1` siblings are only equal when neither has its own padding: `flex: 1 1 0%` adds padding to the base size (Expiration/How it works was 289/309). Use `grid grid-cols-2` for equal cells.
Footer gaps in Figma tablet frames: many `(t)` frames keep the phone frame's height (e.g. 1235), and the Footer is FILL with bottom (MAX) alignment, so the extra height shows up as extra gap above the footer. In code the equivalent is a `flex-1` content column + footer at the end, with the Figma content gap (40) as the minimum; don't copy the inflated gap.

## Pitfalls (from QA runs)

- Under machine load, a render can be captured before scripts and fonts load (serif text, skeletons, no top bar). Re-render with `--wait 11000` before trusting the numbers.
- In zsh, quote URLs with query strings (`"…?channel=email"`), or zsh fails with "no matches found".
- In `xargs zsh -c '… "$@"'` the first argument becomes `$0` and is lost. Use a shell function as the job runner instead.
- Quick 404 check inside a render: `--eval "performance.getEntriesByType('resource').filter(e=>e.responseStatus>=400).map(e=>e.name)"`.
- payment-closed in the MP flow needs `--pre "SDOnboardingContext.saveState({revokedReason:'…'})"` on the MP seed; without it the page redirects to allocation.
- The Figma MCP has a per-seat call limit. In QA runs, do the Figma checks first so they aren't lost.
