# figma-designer — playbook core

Read fully before every job. Keep short; detail goes to `figma-designer-lessons.md` (grep only).

## Files (Agile Partners org, figma-b)
- **🛠 SMART System** `PdvEp0MAIlof6O8MYaXCcy` — library: variables (`primitive-colors`, `semantic colors`
  Light/Dark, `spacing`, `border-radius`, `border-width`, `font`), text styles (Tailwind `text-<size>/<weight>` +
  roles `Title/…`, `Description/…`, `Body/…`, `Label/…`, `Overline`, `Button/…`, `Link/…`, `Caption`, `Amount/…`),
  effect styles `shadow/2xs…2xl`, page „📘 Design tokens" (`13818:33`).
- Sources of truth per module (Figma audit, Oct 2026 — details `wiki/design-system/figma-files.md`):
  Supplier Portal / Payment Preferences / Get Paid / Company Profile / portal login → **[R3] SMART Exchange**
  `9DRzbyv7FDCDYFYN5ZGuwZ`; AP Bills / Pay Page → **[R2] SH – Accounts Payable** `DyBC356t1jIcoPrKjf9Ra8`;
  SD claimant flow → **[LAUNCHED] Default Flow** `4WZgq8XswZFkHcI6bzOIiK` (+ OTP from `ns4uggM7ml8O53mcfRmQXq`);
  Card Manager → `9we1YVhB41SNAHXULwJJUZ`; User Management → `qiy6GvUHQMhdbC7hkXCCyb`;
  Vendor Profile → `uL1CzwiGZr4w89LQ8TPwCt` (iteration II); Consumer Portal → `tK3Ex3e3fDSOebc4I6onyM`.
- Read-only inventory of all 49 files: `~/figma-audit/files/<fileKey>.json` (REST, no MCP cost).

## Workflow
1. Inspect first (read-only `use_figma`: pages, existing components/variables near the target).
2. Build from the prototype: same texts, states and components as the code; library instances only.
3. Bind fills/strokes to `semantic colors`, spacing/radius to variables, text to role styles.
4. Name screens `Module / Step / State`; place in the file's page structure; never cover others' work.
5. QA (`ui-qa-figma`), fix majors, one screenshot after the fix, lessons, report.

## Rules
- Components only — no raw buttons/inputs/selects/badges; missing ones become local components named like the code.
- Auto-layout everywhere, whole pixels, nothing cramped (< 8 px between blocks).
- Don't publish the library; the team publishes after review.
- Batch: few `use_figma` calls; screenshots ≤ 1000 px.

## Gotchas (Plugin API)
- A failing `use_figma` script is rolled back entirely — fix and re-run the same script.
- Variable scopes: FLOAT weights take `FONT_WEIGHT` only (not `FONT_STYLE`); BOOLEAN variables can't be scoped.
- `figma.saveVersionHistoryAsync` isn't supported — rely on Figma's autosave history.
- Text styles with a „mixed" fontName must get an explicit `fontName` (load the font) before editing.
- `resize()` on an auto-layout frame fixes its height — set `primaryAxisSizingMode = 'AUTO'` again.
- Dark-mode previews: wrap swatches in a frame with `setExplicitVariableModeForCollection(semantic, darkModeId)`.
