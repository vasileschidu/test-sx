---
name: sd-design-rules
description: Shared design and workflow rules for the SMART Disburse (SD) onboarding prototype and its Figma file. Load before any SD work in Figma or in the sandbox, and before QA comparisons. Single source of truth for breakpoints, sizes, layout and working rules.
---

# SMART Disburse: shared rules

These rules are shared by the `figma`, `sandbox` and `qa` agents. If you learn a new rule or the
user changes one, update **this file** (not the agent files) and say so in your report.

Repo-wide rules still apply: `PROJECT_RULES.md` (code) and `wiki/AGENTS.md` (wiki, confidentiality,
humans approve all changes).

## Sources of truth

| Question | Source |
|---|---|
| How it looks | Figma file **[LAUNCHED] Default Flow** `4WZgq8XswZFkHcI6bzOIiK`, page **Multi-Party Flow** `867:9754` |
| How it behaves (flow, which button opens what) | Code in `src/pages/onboarding/` and `src/scripts/onboarding-*.js`, `review-documents.js`, `card-created.js`, … |
| Figma vs code disagree | **Do not pick one.** Report the discrepancy and ask the user. |

Demo data on every screen: Rachel Morris, $5,000.00, Horizon Inc., BP-01003. It is sample data, not a client.

## Breakpoints

- **Mobile** ≤ 767px (`max-md:`), **Tablet** 768–1023px (`md:` … `max-lg:`), **Desktop** ≥ 1024px (`lg:`).
- The page layout (left menu) switches at `lg`. Below 1024, content is capped at 640px and centred
  (`onboarding-sidebar.js`), so the content is 608px with `px-4`.
- **Welcome on tablet uses the desktop card** (505×624, desktop waves, larger type, 256px CTA). This is a user decision.

## Components and sizes

- **Buttons (General/Button):** 56px tall in SD, even though the design system's largest is 44. Labels are `text-base/font-medium` (Medium, not Semi Bold).
- **Disabled General/Button:** opacity 40%. Secondary: border gray-300, text gray-500, fill `#ebebeb` (renders `#f7f7f7`). Primary: blue gradient at 40%.
- **Inputs:** SMART System "Text Field [New]" with all states. In code use `window.OBField` (`onboarding-field.js`), never hand-written input classes.
- **Closed screens** (revoked, expired, declined, disputed, no longer available) use the **Tokens** card style: left-aligned card, Reason/Details box, "Need assistance?" contact card with copy icons, language selector.
- **Modals:** dialog modals (illustration + title + buttons) have the X on the LEFT. Modals with a title bar (Review and agree, document viewer) have it on the RIGHT.

## Figma page organisation

- **Names:** top-level sections are numbered ("4. Current Allocation"). Subsections have no number ("Validations").
  Frames are fully numbered with a device tag: `4.0. (m) …`, `4.0. (t) …`, `4.0. …` (desktop).
- **Order in a group:** mobile at x=80 (375 wide), tablet at mobile+375+128 (768 wide), desktop at tablet+768+128 (1728).
  Rows start 256px below the **tallest** frame of the previous row. Groups are 80 padding, with 512 between stacked groups.
- **Gaps:** 1024 between columns inside a section, 2048 between top-level sections (anchor: 0. Welcome).
  📝 Sign to authorize payment sits in row 7, between 7 and 7.1.
- **Section fill:** `#0F0F0F`. Validations sections use `#444444` @10%; copy the fill from an existing one.

## Tablet frames (768)

- Mobile layout, stretched. Container padding L/R 80 (content 608). Max widths from code: forms/titles 460,
  Welcome card = desktop card, Change Allocation/Dispute 666 (frame padding 51), lists full width.
- **Modals:** width = min(desktop modal width, 736), centred. Overlay and Top Bar stretched to 768.
- "Expiration + How it works" cells are **equal width** from tablet up (user decision). Figma: both FILL, How it works padding 10/10. Code: `md:grid md:grid-cols-2`, with How it works text visible and the icon hidden.
- **Footer gap on tablet:** keep the Figma content gap as the minimum (64 to the language pill) with the footer bottom-anchored. Do not copy the inflated gap that appears in (t) frames that kept the phone frame height (user decision, 2026-10-21).
- The 2px width difference Figma shows on bordered Expiration cells (from the 1px INSIDE stroke) is accepted. The code uses an equal grid.
- **Tooltips** (Copy/Copied): centred above the copy icon, top = icon.y − 36 (the desktop rule).
- **Closed screens** (Page/Card style) are cloned from the **desktop** frame and resized.
- **Mobile Menu:** dropdown panel x16 y56 736×108, close button at x720 y16.

## Flow arrows (Figma)

- Real connectors, attached at both ends (never vectors). ELBOWED, stroke 2, corner radius 24, blue `#2563EB`.
  Arrowhead only at the target. Label Onest Bold 32, white on blue.
- Enter the target screen through its TOP (Content/Container/Overlay). A side entry is allowed when
  stacked targets leave no room.
- One lane per arrow. Lines may cross, but never overlap and never pass over a screen.
- **Skip by default:** Validations/error states, pure state variants (e.g. "long name"), and exits out of the flow (Finish and Close).
- A label in a 128px gap may touch frame edges; the user fixes labels by hand. List them in your report.

## Working rules (all agents)

1. **Read the current state before changing anything.** The user edits the same Figma page and repo in parallel
   (arrows re-targeted, sections moved). Never overwrite or delete their edits without asking.
2. **Small, reviewable steps:** one section, or one screen group, per run. No page-wide re-layout unless asked.
3. **Done means evidence:** IDs/files changed, screenshots or measurements, the overlap audit for arrows,
   and other breakpoints checked for regressions. No evidence means not done.
4. **No commit, push or merge** without the user's explicit OK.
5. **Two agents never write to the same Figma page at the same time.**
6. End every run with the report format below.

## Report format

```
## Result: <one line>
Changed: <Figma node ids / files>
Evidence: <audit result, measurements, screenshots>
Not done / skipped: <what and why>
Needs a decision: <questions for the user>
Lessons: <new pitfalls; also add them to the right skill file>
```
