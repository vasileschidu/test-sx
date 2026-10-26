# Project instructions for Claude (and other coding agents)

Static HTML prototype of the SMART suite (SMART Hub, Supplier Portal / SMART Exchange, Consumer
Portal, SMART Disburse, SMART Enroll). Vanilla JS IIFEs, Tailwind v4 from the CDN, Tailwind Plus
Elements (`el-select`, `el-dialog`, `el-dropdown`). No build step. Product docs live in `wiki/`
(read `wiki/AGENTS.md` before changing product behaviour); code rules in `PROJECT_RULES.md`.

## Source of truth (in this order)
1. `.claude/skills/components/SKILL.md` — exact markup and APIs of components that already exist.
2. `.claude/skills/design-system/SKILL.md` — tokens: colours, semantic classes, text roles, spacing.
3. Figma (MCP / screenshots) — layout and composition **only**. Once a component exists in (1),
   Figma is never the source for its markup, padding or states again.

Where a shipped screen and these docs disagree, the screen is ground truth: fix the doc.

## Before writing any markup or CSS
1. Look the component up in the inventory (components skill). If it exists, copy it exactly —
   don't rename classes, re-pad it "to fit", change hover/focus/error colours or restructure the DOM.
2. Only build new markup when nothing matches; give it every state (default, hover, focus-visible,
   active, disabled, error, loading) and add it to the components skill in the same change.
3. No raw hex or px. Use Tailwind classes; for new UI prefer the semantic classes and `type-*`
   text roles from the design-system skill.
4. Shared shell: `<app-nav>`, `<app-topbar>` and `shared.js` — never copy the sidebar/topbar markup.

## Working from Figma
1. `get_design_context` (or a screenshot) for layout.
2. Match every element against the component inventory BEFORE writing code; for anything already
   there, ignore the generated code and reuse the local markup.
3. Figma connections: `figma-b` = Agile Partners files (SMART System, product files);
   `figma-a` = eGov files. SMART System (`PdvEp0MAIlof6O8MYaXCcy`) holds the tokens.

## Definition of done
- Load every changed page at desktop (1440) and phone (390) width: no console errors, no 404s,
  no horizontal scroll. Check dark mode on dashboard pages (`localStorage.theme = 'dark'`).
- Click through the changed flow once. Report what you checked and what you could not.
- New pattern → components skill. New token or role → Figma first, then
  `src/scripts/design-tokens.js` + `wiki/design-system/tokens.md`.
- Bump the `?v=` tag on a changed script that pages load with one.

## Usage budget
Read `.claude/skills/usage-budget/SKILL.md` before launching agents or long Figma work:
right model per job, tight briefs, few Figma calls, hand-off files instead of endless sessions.
Hand-offs: `.claude/handoff/<date>.md`.

## Never
- Push straight to `main` — branch + pull request.
- Write real client names (wiki uses client codes).
- Edit `src/scripts/design-tokens.js` by hand (generated from Figma).
