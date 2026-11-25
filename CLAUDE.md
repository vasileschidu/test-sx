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
3. Dark mode in the same change, every state (hover, focus, active, disabled, selected), Tailwind Plus style —
   see "Dark mode" in the design-system skill. Nothing ships light-only.
4. No raw hex or px. Use Tailwind classes; for new UI prefer the semantic classes and `type-*`
   text roles from the design-system skill.
5. Shared shell: `<app-nav>`, `<app-topbar>` and `shared.js` — never copy the sidebar/topbar markup.
6. **Modals and dialogs are always `rounded-lg` (8px)**, in every state (form, confirm, success), even if Figma shows 10 or 12px.
7. **Modals open smoothly and use the flat backdrop**, like the Supplier Portal "Decline Payment" and "Opt in" dialogs:
   `bg-gray-900/75` with **no blur**; the backdrop fades in (300 ms ease-out) while the panel fades in and slides up
   (mobile) / scales from 95 % (sm+), and leaves in 200 ms ease-in. Use the Tailwind Plus `el-dialog` pattern
   (`el-dialog-backdrop` + `el-dialog-panel` with `data-closed:` / `data-enter:` / `data-leave:` classes) or `OBModal`
   (which does this for you). Never ship a modal that appears instantly or with `backdrop-blur`.
   Only exception: the SMART Disburse onboarding flow (`src/pages/onboarding/`), whose Figma specifies black 75 % + blur 5 px.
8. **Every modal's close (X) button is the one from the Supplier Portal "Decline Payment" dialog**, hover included:
   a `p-1` `rounded-md` button, 20 px X icon (`size-5`, 24 viewBox, `stroke-width="1.5"`), `text-gray-400`,
   hover `bg-gray-100` + `text-gray-500` (dark: `hover:bg-white/10` + `hover:text-gray-300`), `cursor-pointer`, with a
   `sr-only` "Close" label and the shared `focus-visible` outline. No 40 px circles, `p-1.5`, `rounded-full` or other icons,
   even where Figma draws them. Keep the position the layout needs (top-right strip, or corner of the content).
   Same exception: SMART Disburse onboarding keeps its own.
9. **A copy icon always copies.** Wherever Figma or the markup shows a copy / duplicate icon (card number, admin number,
   account number, email, reference, link…), wire it up in the same change: use `OBModal.copyButton(label, value)` (needs
   `onboarding-modal.js` on the page; its global `[data-ob-copy]` handler writes to the clipboard and swaps the icon to the green
   check with the "Copy" / "Copied" tooltip). No decorative copy icons, no home-made icon or handler, no click that does
   nothing. Copy the real value (the unmasked one when the field is masked). Check every new screen for copy icons before
   you call it done, and say in the report which ones you wired.

## Working from Figma
0. **Figma is the source of truth for content, not just layout.** Titles, labels, copy, field and
   button order, which buttons show in which state, section structure, icons: take them exactly from
   the frame. Never invent a title, group, button position or text. If Figma doesn't show a state or
   text, leave it minimal, mark it `TODO(confirm)` and say so. If a ticket or the wiki disagrees with
   Figma, follow Figma and flag the difference. Agents without Figma access must be given the frame
   (screenshot / spec) in their brief, or must stop and ask.
1. `get_design_context` (or a screenshot) for layout.
2. Match every element against the component inventory BEFORE writing code; for anything already
   there, ignore the generated code and reuse the local markup.
3. Figma connections: `figma-b` = Agile Partners files (SMART System, product files);
   `figma-a` = eGov files. SMART System (`PdvEp0MAIlof6O8MYaXCcy`) holds the tokens.

## Agents (same pattern as GEAP)
- **`proto-engineer`** builds UI in code; **`figma-designer`** draws it in Figma with the SMART System
  library. Order: code first, then Figma. Each reads its playbook core (`.claude/playbooks/<agent>.md`),
  greps — never reads whole — its lessons file, and appends lessons after every job.
- **`ui-qa-code`** and **`ui-qa-figma`** are the definition of done for UI work (`model: sonnet`).

## Definition of done (UI)
1. Serve with `python3 tools/serve.py` (no cache).
2. `npm run qa:code -- --pages <changed pages> --files <changed files> [--dark]` and
   `npm run qa:hover -- --pages <changed pages> --dark` → zero major findings, `dark-light-hover 0` (or run the `ui-qa-code` agent).
3. Refactors / token swaps: `tools/ui-qa/pixel-compare.mjs` before/after → identical, or every diff explained.
4. Figma: `ui-qa-figma` → PASS. Code first, then Figma.
5. New pattern → components skill; new token or role → Figma first, then `design-tokens.js` + `wiki/design-system/tokens.md`.
6. Bump the `?v=` tag on a changed script that pages load with one. Report what you checked.
7. Consistency: `npm run qa:consistency` must not show more non-exact buttons / heading variants than before
   (`wiki/design-system/consistency-report.md`). Inconsistencies people report go in
   `wiki/design-system/discrepancies.md` (skill `log-discrepancy`).

## Usage budget
Read `.claude/skills/usage-budget/SKILL.md` before launching agents or long Figma work:
right model per job, tight briefs, few Figma calls, hand-off files instead of endless sessions.
Hand-offs: `.claude/handoff/<date>.md`.

## Never
- Push straight to `main` — branch + pull request.
- Write real client names (wiki uses client codes).
- Edit `src/scripts/design-tokens.js` by hand (generated from Figma).
