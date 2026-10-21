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
- `--full` captures the whole page height.
- Save outputs in the session scratchpad, never in the repo.
- Read the PNG with the Read tool to look at it.

Don't use plain `chrome --headless --window-size=375,…`: it renders at about 500px and crops, so every page looks broken.
Pass sizes explicitly per call; in zsh, `set -- $w` does not word-split.

## 3. Demo state

Many pages read the demo state from `localStorage` (`sd-onboarding-context.js`, `onboarding-flow.js`).
A fresh headless profile has no state, so some pages show defaults or redirect.
- `?flow=multi-party` starts a Multi-Party demo.
- If a page looks wrong only in headless, say so in your report instead of "fixing" it. On 2026-10-21, Allocation showed no top bar in headless.

## 4. Measuring against Figma

Compare the same things on both sides: frame-relative x/y/width/height of key elements, and font size/weight.
Report the differences as a table: element | Figma | sandbox | Δ.
Figma desktop frames are **1728 wide**. Render the desktop at 1728×1024, or compare boxes relative to a shared element such as the card, not to the viewport.
`?flow=multi-party` seeds the demo only on the entry page; on inner pages (e.g. payment-status.html) it is dropped.
Figma strokes `OUTSIDE` take no layout space. A CSS `border` does, so the equivalent is `ring-*`.
Two `flex-1` siblings are only equal when neither has its own padding: `flex: 1 1 0%` adds padding to the base size (Expiration/How it works was 289/309). Use `grid grid-cols-2` for equal cells.
Footer gaps in Figma tablet frames: many `(t)` frames keep the phone frame's height (e.g. 1235), and the Footer is FILL with bottom (MAX) alignment, so the extra height shows up as extra gap above the footer. In code the equivalent is a `flex-1` content column + footer at the end, with the Figma content gap (40) as the minimum; don't copy the inflated gap.
