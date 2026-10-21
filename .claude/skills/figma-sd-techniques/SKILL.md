---
name: figma-sd-techniques
description: Proven Figma Plugin API techniques for the SMART Disburse Multi-Party Flow page. Covers making attached elbow flow arrows (clone model), the reliable arrow/screen overlap audit, building tablet frames, and re-layout without breaking arrows. Load before writing flow arrows, tablet frames or moving sections in Figma.
---

# Figma techniques for SD

Load the official `figma-use` skill first (`get_figma_skill` → `skill://figma/figma-use/SKILL.md`) and
pass `skillNames: "resource:figma-use"` on every `use_figma` call. Rules about *what* to build are in
`sd-design-rules`; this file is about *how*.

Ready-to-paste helpers:
- `references/arrows.js`: `deriveW()`, `cloneArrow()`.
- `references/audit.js`: the overlap audit.

## 1. Flow arrows: the clone model

`figma.createConnector()` does not exist in design files, and **elbow routes are only computed by the editor**.
A clone keeps its source's stored route. What works:

- **Source:** the connector named **"Request Code"** in subsection "📩 Email (Code Verification)" (section 1).
  It is an editor-routed connector. Don't hard-code its id: find it by name and parent, then read its bend point with `deriveW()`.
- **Model:** a clone behaves like **one bend point W = (lane x, approach y)**.
  - The route goes trigger → (horizontal first for a `position` endpoint, vertical first for magnet BOTTOM) → W → horizontal to the target x → vertical into the target.
  - With a side magnet (LEFT/RIGHT) on the target, the final lane is fixed about 49px outside that edge. Two side entries on the same edge collide.
- **Translation:** stored waypoints are relative to the connector's **parent**. To move the route by Δ:
  1. Create a temp frame **inside the destination parent**.
  2. Place it at `tmp = W_new − W_src + parentAbs(src) − parentAbs(dest)`.
  3. Clone the source into it at the same `x/y` as the source and set both ends.
  4. `appendChild` the clone to the destination parent, then remove the temp frame.
  `cloneArrow()` does all of this.
- **Choosing W:**
  - **Lane:** a free vertical corridor, either in a gap between frames or beside the column.
  - **Approach y:** in the gap row just above the target.
  - **L-shape:** W = (target x, trigger y).
  - **Straight down:** W = (x, midpoint).
- **Endpoints:**
  - **Target** (`connectorStart`): magnet TOP, or `position {x, 0}` to offset the entry when two arrows share a target.
  - **Trigger** (`connectorEnd`): `position` at the edge you exit from, or magnet BOTTOM.
  - Magnets on **instance sublayers** are rejected. Attach to the instance itself with a `position`.
- **Nesting rule** for several arrows that share a corridor: an arrow whose horizontal is higher must enter
  farther right (or farther from the corridor). Otherwise its vertical crosses the others' horizontals.
- **Labels:** `c.text.characters`. Load the font first with `await figma.loadFontAsync(c.text.fontName)`.
  Label position cannot be set from the plugin; it sits at the path midpoint.
- Unsupported in plugins: `connectorControlPoints`, `resetConnectorControlPoints`, `connectorTextPosition`, resize/rescale.

## 2. Overlap audit (run after every arrow change)

`exportAsync({format:'SVG_STRING'})` returns the outlined stroke.
1. Anchor it at the **arrow tip**, using the first subpath and the target point.
2. Keep only segments that have a **twin 0.5–4px away with the same span (±30)**. Those are the two edges of the real stroke. Unpaired segments are phantom jumps between subpaths and give false alarms.
3. Test the real segments against every screen frame (a FRAME whose parent is a SECTION), excluding the arrow's own start and end screens.

`references/audit.js` returns `{n, issues}`. **0 issues** is the bar. `get_screenshot` renders connectors
inside sections wrongly, so trust the audit.

## 3. Tablet frames

1. Clone the `(m)` frame and rename `(m)` → `(t)`.
   - Use the **desktop** frame instead when the screen has no side menu, i.e. closed/Tokens pages whose desktop child is named `Page`.
   - **Pair mobile↔desktop by y, not by name.** Some frames have no number prefix.
2. `t.maxWidth = null` **before** `resize` (mobile frames have a hidden maxWidth of 414). Resize to 768 × max(1024, mobile height). Then set `minWidth 768`, `maxWidth 1023`.
3. Apply the tablet rules from `sd-design-rules`:
   - Container padding;
   - absolute modals centred, with width from the desktop twin, at most 736;
   - Overlay and Top Bar stretched to 768;
   - cells, tooltips.
4. Placement: x = mobile.x + 503, same y. Desktop frames move +896. Widen the subsection and the section.

## 4. Re-layout without breaking arrows

- Moving **frames** inside a section breaks the arrows attached to them: their waypoints stay put.
  Moving a **whole section** keeps the routes of connectors parented inside it.
- So after a re-layout, **rebuild every connector whose endpoints shift differently from its parent**:
  1. Before moving, record each connector's W from its current route with `deriveW()`. This keeps the user's edits.
  2. Lane shift = the shift of the unit that contains the lane, or the nearest unit to its left that overlaps in y. For an L-shape, include the target y in that y-range.
  3. Move, then rebuild with the shifted W, then audit.
- Check for section overlaps after every move, using all four edges of each pair.

## 5. Pitfalls already paid for

- `figma.currentPage = …` throws. Use `await figma.setCurrentPageAsync(page)` once per call.
- `node.depth` does not exist.
- Collect the node lists *after* removing nodes, or the loop hits deleted ids.
- `findAll` on the whole page is slow but fine. Cache screen bounding boxes once per call.
- **FILL children do not split equally like CSS `flex-1`/grid.** Figma shares the free space after each child's own content width, padding and stroke. For equal columns, give both children the same padding and stroke. An INSIDE stroke on one side makes it 2px wider; the fix is the same stroke, transparent, on the other side.
- Button instances may come out 44px tall. Set `layoutSizingVertical='FIXED'`, resize to 56, and set the label to Medium.
