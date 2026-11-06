---
name: figma-sd-techniques
description: Proven Figma Plugin API techniques for the SMART Disburse Multi-Party Flow page. Covers making attached elbow flow arrows (clone model), the reliable arrow/screen overlap audit, the read-only prototype audit (modal structure, fixed children, broken interactions, detached arrows), building tablet frames, and re-layout without breaking arrows. Load before writing flow arrows, tablet frames, modals or moving sections in Figma.
---

# Figma techniques for SD

Load the official `figma-use` skill first (`get_figma_skill` → `skill://figma/figma-use/SKILL.md`) and
pass `skillNames: "resource:figma-use"` on every `use_figma` call. Rules about *what* to build are in
`sd-design-rules`; this file is about *how*.

Ready-to-paste helpers:
- `references/arrows.js`: `deriveW()`, `cloneArrow()`.
- `references/audit.js`: the overlap audit (reports a DETACHED line instead of crashing on a connector with a lost end).
- `references/prototype-audit.js`: the read-only prototype audit (§4c).

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
   - **Centre only real modals.** Other absolute children (dropdown lists, menus, cursors) keep the desktop twin's offset from their anchor: the modal, or the element they point at. The Decline "Reason" list and a Revoked cursor were once wrongly centred or left outside the frame.
4. Placement: x = mobile.x + 503, same y. Desktop frames move +896. Widen the subsection and the section.

## 4. Re-layout without breaking arrows

- Moving **frames** inside a section breaks the arrows attached to them: their waypoints stay put.
  Moving a **whole section** keeps the routes of connectors parented inside it.
- So after a re-layout, **rebuild every connector whose endpoints shift differently from its parent**:
  1. Before moving, record each connector's W from its current route with `deriveW()`. This keeps the user's edits.
  2. Lane shift = the shift of the unit that contains the lane, or the nearest unit to its left that overlaps in y. For an L-shape, include the target y in that y-range.
  3. Move, then rebuild with the shifted W, then audit.
- Check for section overlaps after every move, using all four edges of each pair.
- **Moving top-level sections re-routes PAGE-level connectors** (cross-section arrows), even when both ends move by the same amount; shifting `c.x` too doesn't help. What works (2026-11-05, sections 5+ moved −4471, 11 arrows, SVG byte-identical): create a temp SECTION at x/y 0 (so relative = absolute), `appendChild` the moved sections AND the page-level connectors whose both ends move, `tmp.x += D`, then append each section back to the page and reset `s.x` to its absolute x, append the connectors back plainly (they keep the absolute position), `tmp.remove()`, and restore the z-order with `page.insertChild(origIndex, node)`. Verify with the exported SVG (identical) and bbox (x shifted by D). Arrows with only one end moving: rebuild with cloneArrow (lane shifted with the unit that holds it).
- **An arrow can be re-routed by the editor after a plugin edit to its endpoint frame** (2026-11-05: "Expiration" 1367:73000; after the Dispute button was removed from 4.0 desktop, its lane slid from the tablet–desktop gap to x 22626, inside the tablet column). The plugin audit right after the edit was clean, so re-run `auditArrows()` at the start of the next run and rebuild any such arrow with its lane back in the gap.

## 4b. Modal structure recipe (FINAL 2026-11-03; built by the user on `1545:94795`, since deleted; live reference: 4.12 desktop `959:25701`)

Target: `Modal & Background` (the scroll layer) > `Modal Wrapper` (24 top/bottom) > `Modal` (white card). In one script per frame:
1. Check that no connector endpoint is on the Overlay / old backdrop, the Modal or anything inside it, and no reactions.
2. Backdrop: reuse an existing "Modal & Background" or create one at the Overlay's index (then remove the Overlay):
   absolute, x/y 0, resized to the frame, STRETCH/STRETCH, VERTICAL, both axes FIXED, align CENTER/CENTER,
   padding 0/16/0/16, gap 0, fill #000 @0.75, BACKGROUND_BLUR 5, `clipsContent=true`, `overflowDirection='VERTICAL'`.
3. `Modal Wrapper` (exactly as the reference 1537:101776, user 2026-11-03): `figma.createAutoLayout('HORIZONTAL')`,
   no fills, padding 24/0/24/0, gap 8, counter axis CENTER, width **HUG**, height **HUG**, `clipsContent=false`;
   append it to the backdrop.
4. Card "Modal": append to the wrapper, `layoutPositioning='AUTO'`, width **FIXED = its current width** (512 desktop /
   tablet, 343 phone, or the modal's own width, e.g. 1048 Review/viewer), height **HUG**, `maxHeight=null`,
   `clipsContent=true`, `overflowDirection='NONE'`. Children Header / "Content" / Footer: HUG, no own scroll, original
   look. Exception: Review and agree and the Document viewer use `Modal & Background` (padding 24, no scroll) > `Modal`
   (height FILL + maxHeight 752) with the inner scroller FILL — no wrapper (user's 6.6 desktop, 2026-11-03). Instance children: don't set `overflowDirection` (throws "cannot be overridden").
5. Verify: the card box at normal size is unchanged (x, y, w, h); a tall card shows y < 0 in the editor — expected.
Node ids of the card and its children survive the reparent.
**Screen frame: `numberOfFixedChildren = 0`.** Phone/tablet screens had 2–3 "Fixed" children; with the backdrop among
them the modal did NOT scroll in the prototype (6.2.2 (m), user-confirmed fix 2026-11-03). Always clear it when converting.
Review and agree "Accept after scroll": an invisible absolute "Scroll end trigger" (48 tall, no fill) at the bottom of
"Agreement (scroll)" with MOUSE_ENTER → NAVIGATE to the 'scrolled to end' frame (6.6→6.7, 7.12→7.13, 8.14→8.15, 9.5→9.6).
Rollout notes (0.2 Decline, 2026-11-03):
- Popups drawn at frame level (e.g. 0.2.2 "Dropdown Menu" above the backdrop) stay where they are; don't move them in.
- Layout reads of nested HUG children in a freshly resized clone can be stale; check the card box or a screenshot.
- Annotations: `node.annotations = [{ label: '…' }]` works (categories exist: Development, Interaction, Accessibility,
  Content). The 0.2.1 Modal nodes carry the short-screen note; keep it on the card when restructuring.
- (FINAL rollout, 0.2 all 27 frames, 2026-11-03) Setting `overflowDirection` on an **instance** child (Modal/Header,
  Modal/Footer) throws "cannot be overridden in an instance", even to 'NONE'. Only touch `type==='FRAME'` children whose
  value differs. A failed `use_figma` call is rolled back as a whole, so a batch either fully applies or not at all.
- With a FILL-height card capped by maxHeight, the old card box can include dead white space below the footer
  (0.2.2.2 (t), 0.2.6 (t): Text Area 64 instead of 88 → card 542 vs 566). HUG shrinks it; the box check flags it. Report it.
- The reference wrapper `1537:101776` is HORIZONTAL + HUG with a FIXED card. The first 0.2 rollout used a VERTICAL +
  FILL wrapper and a FILL card + maxWidth; all 27 0.2 frames were switched to the reference form the same day (card
  boxes unchanged). Convert order: card `layoutSizingHorizontal='FIXED'` + `resize(w, h)` + `layoutSizingVertical='HUG'`
  FIRST, then the wrapper `layoutMode='HORIZONTAL'` + HUG/HUG (a FILL child in a HUG wrapper conflicts).
- (Contact Us / MP info modals rollout, 2026-11-03) Many **desktop** frames have a flow arrow attached to the
  **Overlay** RECTANGLE (5.3, 4.12, 4.5, 4.7 — also on its "Dispute" button —, 5.1, 8.4). Removing the Overlay would
  detach the arrow, so those frames are skipped until the user re-targets the arrow (e.g. to the backdrop or frame).
  Always run the endpoint check before removing the Overlay; (m)/(t) frames had no endpoints.
- Some (t) cards were FIXED height (5.1, 5.2, 8.4 (t)). HUG can shrink them: 8.4 (t) 447 → 421.5 (dead space under
  the Body), re-centred y +12. Old absolute cards were already centred, so the boxes otherwise stayed identical.
- (Sections 6–9 small modals, 2026-11-03: Expiration, How it works, Get your money faster, Get your receipt, How this
  works; 79 frames) Same Overlay-arrow pattern on desktop 6.1.5, 6.1.6, 6.2.3 (also on its Text Field), 6.2.6, 8.17
  (also on a Radio), 8.18, 9.8 (also on a Radio), 9.9: skipped. Odd card heights (455, 479) in a 1024 frame centre
  at y 284.5 / 272.5 instead of the old rounded 285 / 273 (0.5 px, expected). FIXED (t) cards kept their height under HUG.
- (How to use / Sign / Review and agree / Document viewer, 2026-11-03; 50 frames) **Inner-scroller modals** (Review and
  agree "Agreement (scroll)", viewer "Viewer"): wrap only — card `layoutSizingVertical='FIXED'` at its height (maxHeight
  kept) inside the HUG wrapper; boxes stay identical and the inner scroller keeps working. How this works "Body" was a
  FILL + VERTICAL-scroll FRAME: set it HUG + overflow NONE; phone card 780 → 993 (y −90), tablet 780 → 881. The Overlay-
  arrow pattern held again: 18 desktop frames skipped (all 3.x, 6.x, 7–9 Review desktops except 6.11/6.13/6.14/6.12.2).
- (Overlay-arrow desktops, 32 frames, 2026-11-03, user-approved) **Re-attaching an Overlay endpoint to the backdrop
  works without re-routing**: create the backdrop at the Overlay's index (layoutMode + both sizing modes FIXED BEFORE
  `resize(frame)`, then x/y 0), check its box equals the Overlay's, set `c.connectorStart/End = { endpointNodeId: bd.id,
  magnet }` or `{ endpointNodeId: bd.id, position }` copied from the old endpoint, compare `absoluteBoundingBox` (±1)
  and throw if it moved (rolls the whole call back), THEN `ov.remove()`. 32 endpoints: all bboxes unchanged, exported
  SVG byte-identical for 31 (one differed with the same bbox and a clean audit). Endpoints on the card / inside it keep
  their ids through the reparent. Audit 82 connectors, 0 issues before and after.

## 4c. Prototype audit (READ-ONLY; run after any modal / prototype work, before telling the user it's done)

`references/prototype-audit.js` → `prototypeAudit(page, { limit })`. Paste the function, then:
`const page = await figma.getNodeByIdAsync('867:9754'); await figma.setCurrentPageAsync(page); return await prototypeAudit(page, { limit: 25 });`
One call covers the whole page (624 screens, 82 connectors, 2026-11-04). If it ever times out, batch with
`{ section: /^6\./ }` (RegExp on the top-level section name). It only reads; it never changes the file.

What it returns (counts + the first `limit` items each):
- `fixedChildren`: modal screens with `numberOfFixedChildren > 0`, with the fixed layers (the LAST n children) and the
  modal kind. A backdrop among them broke the backdrop scroll on 6.2.2 (m).
- `legacyModal`: screens with an `Overlay`/`Modal` child but no `Modal & Background` (not converted, or not a modal, e.g. the side-menu "Menu open" frames).
- `modal`: per frame, every deviation as `Layer.prop exp X got Y`, plus `byCheck` (deviation → frame count; read this
  first). Kind = `exception` when `Modal & Background` contains `Agreement (scroll)` or `Viewer`, else `standard` (§4b).
  Also checks the backdrop box = frame, STRETCH/STRETCH, fill #000@75 %, background blur 5, no stray scrollers.
- `selfTest`: the two reference frames (4.12 desktop `959:25701` standard, 6.6 desktop `1170:9894` exception) must be
  `clean`. If not, the expectations are stale: re-read the references before trusting anything else.
- `reactions`: `broken` (destination missing, on another page, not a top-level frame, scroll-end trigger to another
  device), `empty` (a reaction with no action), `scrollEndTriggersOK` (the intended MOUSE_ENTER hotspots, count only).
- `connectors`: `detached` (free end, deleted node, other page, hidden layer) and `endpointNotInScreen`. Overlaps are
  still `auditArrows()` (§2); run it after `detached` is 0.

How to read it: 0 in `modal.framesWithIssues`, `reactions.broken`, `connectors.detached` and the expected
`fixedChildren` list is the bar. Report every finding to the user with frame name + node id + what's wrong; **fix
nothing from the audit on your own**: fixes go through the user first.
What it cannot see: real prototype behaviour (whether a scroll actually works when played), hotspot geometry of the
scroll-end triggers, whether an arrow/reaction points at the *right* screen, card widths, flow starting points.
Known state 2026-11-04: 180 standard + 35 exception modals all clean; 24 exception (m)/(t) frames (3.3/3.7/3.8/3.9,
6.6/6.7, 7.12/7.13, 8.14/8.15, 9.5/9.6) have the backdrop fixed (fixed=2: Top Bar + Modal & Background), untested
whether that blocks the inner scroller; 1 empty ON_CLICK on 0.0 (m) Welcome "Ellipse 38" `1084:35152`. The original
reference frame `1545:94795` (and wrapper `1537:101776`) no longer exists; 4.12 `959:25701` has the identical structure.

## 5. Pitfalls already paid for

- `figma.currentPage = …` throws. Use `await figma.setCurrentPageAsync(page)` once per call.
- `node.depth` does not exist.
- Collect the node lists *after* removing nodes, or the loop hits deleted ids.
- `findAll` on the whole page is slow but fine. Cache screen bounding boxes once per call.
- **FILL children do not split equally like CSS `flex-1`/grid.** Figma shares the free space after each child's own content width, padding and stroke. For equal columns, give both children the same padding and stroke. An INSIDE stroke on one side makes it 2px wider; the fix is the same stroke, transparent, on the other side.
- Button instances may come out 44px tall. Set `layoutSizingVertical='FIXED'`, resize to 56, and set the label to Medium.
- **Mobile and tablet frames have a FIXED height.** Adding spacing inside (gap, padding) does not grow the frame; the footer overflows and is clipped. Grow the frame by the deficit (sum of hug heights + gaps − Content height). Leave viewport-clipped modal frames (812/1024 tall) as they are. Growing a frame can push its bottom into an arrow lane in the row gap: re-run the audit.
- Footer `paddingTop` inside a FILL footer with no slack has no visible effect until the frame grows (layout reads in the same call can also be stale; re-measure in a new call).
- **cloneArrow W offset with a `position` trigger:** the "Request Code" source has a BOTTOM-magnet trigger. With a `position` trigger the result once landed off by (−156, +144) from the requested W. Check the new route with `connectorSegments`; if it is off, rebuild once with W + (requested − actual). Keep the old connector until the new route checks out.
- The W offset also happens with a BOTTOM-magnet trigger (2026-10-26, 8.19 → 8.20 straight-down arrow: off by (−9178, +70)). The one-shot correction W + (requested − actual) fixed it. Always check `connectorSegments` after every cloneArrow.
- Modal buttons are often **renamed instances** ("OK", "Close"), not "General/Button". To scan labels, search TEXT nodes whose ancestor chain contains `Button/Primary`.
- Do not re-clone a clone through a temp frame with `tmp.x = W − srcW` when both share a parent: the route came out wildly wrong. Always clone from the Request Code source.
- **General/Button is a wrapper** (no Size property, no fill) around a nested `Button/Primary` / `Button/Secondary` instance (Size xs–xl). For another size: `wrapper.children[0].setProperties({Size:'md'})`, then set wrapper AND inner `layoutSizingHorizontal='HUG'` and wrapper `layoutSizingVertical='HUG'` (the Default Primary wrapper is FIXED 56 and keeps the md inner at 56). The Primary wrapper turns on a right arrow icon: set every `Right Icon#…`/`Left Icon#…` boolean to false. The visible radius and the glow live on the **inner** instance; the wrapper's radius (10) is invisible.
- **Removing a node that is a connector endpoint deletes the connector too** (2026-11-05: removing button 868:11113 silently removed arrow 1377:94234). Collect every connector id/endpoint you need BEFORE removing anything, and never touch a connector object after removing its endpoint (throws "node does not exist", the whole call rolls back). Before deleting buttons/frames, check that no arrow you must keep ends on them.
- Removing a button from a 2-button CTA in a fixed-height (m)/(t) frame: shrink the frame by 56 + gap (80 on Current Allocation), clamped to 812 / 1024; leave 812/1024 viewport (modal) frames as they are. Desktop needs nothing (CTA bottom-anchored).
- Gap above a bottom CTA in (m)/(t)/desktop form frames is `16 + Spacer + 16`. For a 56 minimum give the Spacer `minHeight 24`; don't switch a non-growing Spacer to grow (it moves the CTA to the frame bottom).
