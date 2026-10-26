# UI QA tools

Run with the prototype served (`npm run serve`). All use your installed Google Chrome via `playwright-core`.

| Tool | Command | What it finds |
|---|---|---|
| Code audit | `npm run qa:code -- --pages <a,b> [--files <changed>] [--scope "<css>"] [--dark] [--viewports 1440,390]` | console errors, failed requests, horizontal overflow, overlapping controls, clipped text without tooltip (major); spacing / radius / font size off the Tailwind scale, colours outside the palette, raw hex / arbitrary px / inline style in added lines (minor) |
| Hover audit | `npm run qa:hover -- --pages <a,b> [--scope "<css>"]` | controls with no visible hover, or covered by an invisible layer (major) |
| Pixel compare | `npm run qa:pixel -- --capture before --pages <a,b> [--dark]` … `--capture after` … `--compare before,after` | proves a refactor is visually neutral |
| Figma audit | paste `figma-audit.js` (set `ROOTS`) as the code of a read-only `use_figma` call | raw controls, unbound colours, missing text styles, off-scale / unbound spacing, no auto-layout, clipping, fractional px, image icons |

Reports go to `tools/ui-qa/out/` (git-ignored). Agents: `.claude/agents/ui-qa-code.md`, `ui-qa-figma.md`.
