# figma-designer — lessons archive

Grep this file (`grep -n -i -A3 "<topic>"`); never read it whole. Append ≤ 3-line dated lessons, newest last.
Tags: [tokens] [library] [audit] [api] [naming] [geap-style].

- 2026-10-16 [audit] Full-file REST downloads can exceed 6 GB (SMART Exchange): fetch page by page with
  `/v1/files/:key/nodes?ids=…&geometry=omit`, summarise each batch, keep only the summary.
- 2026-10-16 [audit] Nested SECTIONs inside SECTIONs hide frames from a top-level scan — recurse into sections.
- 2026-10-19 [tokens] SMART System colours were Tailwind v2-named (yellow = amber, green = emerald, purple = violet,
  light-blue = sky). Renaming + revaluing by name silently changes hues — map by intent first.
- 2026-10-19 [tokens] Text styles bound to `size/*`, `leading/*`, `family/sans` variables; every token carries WEB
  code syntax (`var(--color-blue-600)`) and a Tailwind description so Dev Mode / MCP hand over our classes.
- 2026-10-20 [tokens] Documentation pages bind every swatch / bar / specimen to its token — they update themselves.
  Found two real token bugs that way (`text/base/default-on-color` black in dark, `text/disabled/secondary` invisible in dark).
- 2026-10-26 [tokens] Code pins the v3 hex palette (`tailwind-theme.js`, Vlad) while SMART System primitives hold v4
  values (unpublished). Pending decision — don't publish SMART System colour changes until it's settled.

- 2026-11-18 Cloning a SECTION keeps connectors attached to the cloned nodes; removing a frame also deletes connectors attached to it (re-point `connectorEnd` first). `figma.createConnector` is blocked, so extra connectors = `.clone()` the connector + reassign `connectorStart/End`; the cloned elbow route stays stale (set end magnet `AUTO` then toggle `connectorLineType` STRAIGHT→ELBOWED to re-route). Endpoints can't be nested instance children.
- 2026-11-18 Reusing text from a dark card (white fill) in a light card: copy `fills` from a light-theme text node (keeps variable bindings). Swapping an icon via `swapComponent` keeps the old vector fill override (green check -> green warning): copy fills from the right icon. Spacing vars via `search_design_system` + `importVariableByKeyAsync` (padding `p-4`, `p-3`).
- 2026-11-18 Library vars/styles by key: search_design_system once (semantic colors, padding p-1/p-2/p-3/p-4, rounded-md/lg, text-sm/xs normal+semibold), then importVariableByKeyAsync / importStyleByKeyAsync + setBoundVariableForPaint; Separator set key 5dce31eb... (Type=Line). Mixed-weight line in one text: setRangeTextStyleIdAsync per range.
- 2026-11-18 [library] Library-owned menu (SMART System `Menu-SMART-Exchange`) can't be edited from a product file: build a local component set
  (detach one instance, edit, `createComponentFromNode` + `combineAsVariants`) and `swapComponent` all instances; then `resetOverrides()` on every
  swapped instance (overrides map by position and leave stale labels). Hidden nested layers drop out of `.children` — index after hiding shifts.
- 2026-11-18 [api] STP topbar `Notifications & Profile` is a horizontally flipped frame (children flipped back): append new children LAST for
  "leftmost", then set `relativeTransform=[[-1,0,x+w],[0,1,y]]` or text renders mirrored. `getRangeFontName` can return a symbol: load Inter styles by name.
- 2026-11-18 [audit] `get_metadata` on a whole screen is huge (tables): use read-only `use_figma` with `findAll` + counts. `sips --crop` is centre-based.
