---
name: sd-design-rules
description: Shared design and workflow rules for the SMART Disburse (SD) onboarding prototype and its Figma file. Load before any SD work in Figma or in the sandbox, and before QA comparisons. Single source of truth for breakpoints, sizes, layout and working rules.
---

# SMART Disburse: shared rules

These rules are shared by the `sd-figma`, `sd-sandbox`, `sd-qa` and `sd-flow-mapper` agents. **On SMART Disburse they override** the suite skills `components` and `design-system` and `CLAUDE.md` where those disagree; elsewhere in the suite they don't apply. If you learn a new rule or the
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
- **Bordered secondary buttons stay 56:** a 1px border on top of `py-4` makes 58. Use `py-[15px]` or `h-14` (`OBModal` buttons carry `h-14`). Pages that read `payableContext` must render after `SDOnboardingContext.bootstrap()` resolves, or they race (payment-closed showed $0.00).
- **Inputs:** SMART System "Text Field [New]" with all states. In code use `window.OBField` (`onboarding-field.js`), never hand-written input classes.
- **Closed screens** (revoked, expired, declined, disputed, no longer available) use the **Tokens** card style: left-aligned card, Reason/Details box, "Need assistance?" contact card with copy icons, language selector.
- **Modals:** dialog modals (illustration + title + buttons) have the X on the LEFT. Modals with a title bar (Review and agree, document viewer) have it on the RIGHT.

## Decisions from the full QA sweep (user, 2026-10-26)

- **Gap above the primary CTA is 56 at every breakpoint.** Done in Figma (2026-10-26): forms use Content `itemSpacing 56`; summary screens (Title/Groups/Consents/Footer) keep 40 between blocks and use Footer `paddingTop 16`. Fixed-height mobile frames grew by 16.
- The receipt date may wrap to two lines on Submitted screens ("… AM (ET)"). Leave it as is.
- On tablet, the Submitted / Card Created **action buttons are 608** wide (the full tablet content width). The receipt paper itself stays 302, as in Figma (t).
- Verification-failure revoke uses the Tokens "Request no longer available – Revoked" screen (`payment-closed.html`). The old centred `revoked.html` is retired.
- "See allocations log" on Change Allocation shows **only after a change exists** (code: `mp.log.length > 1`). Figma states before any change hide it.
- Choose Payment Method chips (Message / Expiration / Full details): **phone hugs** (103/110/114, centred); **tablet and desktop are FILL, equal** (197 / 180 each). Code: `md:flex-1`. (Corrected 2026-10-26 after the Figma (t) frame was re-checked.)
- The Dispute Message textarea is **88** tall.
- **Titles are Regular + Semi Bold** (e.g. "Let's make sure **it's you!**"), consistent across steps.
- The Payment Amount card has **no shadow**.
- Disabled secondary button: keep the gray rule above (#ebebeb at 40%). Figma frames showing white are wrong.
- Title block gaps: forms (General/Title) title → subtitle **16**; summary screens ("One Final Step") **10**. Summaries on phone/tablet: 40 between amount block, groups and consents (desktop 36). "I want my money faster!" sits 24 below the amount card.
- Client contact card (closed screens, Contact Us modal): value rows are 20 tall (text-sm/leading-5).
- Modal primary buttons (Submit, OK, Send and Continue…) use the **gradient** primary style, as in Figma. They do not use flat blue. Code: `OBModal.PRIMARY_BUTTON` (`onboarding-modal.js`): gradient 153°, no glow, disabled 40%. The document viewer Next/Done stays a small flat button (Figma 3.3).
- A bank-verification failure goes to the Tokens revoked screen. The reason reads "Exhausted attempts to verify bank account by Rachel Morris", with a matching Figma screen in section 8.
- Figma row gaps of 240 (where mobile frames grew by 16) are accepted; don't re-layout just for that.
- **Button corner radius is 6** for every SD General/Button (primary, secondary, page, modal, md size), in Figma and code (`rounded-md`). The user changed this from 8 to 6 on 2026-10-26 (6 = design-system default). The "Change" pill keeps its pill radius.
- **No glow on buttons anywhere.** Remove the 0 16 24 rgba(55,115,255,.16) shadow from primary buttons in code and Figma (Figma: override effects locally on instances, don't change the library) (user, 2026-10-26).
- "Review and agree" dialog: **Cancel and Accept are General/Button size md** (secondary + primary), in Figma and code (user, 2026-10-26).
  Spec (Figma, 2026-10-26): h32, padding 6/10, gap 4, radius 6, label Inter Medium 14/20, hug width. Primary: gradient #3773FF→#2254CA, white text, no shadow; disabled = 40% opacity. Secondary: white fill, 1px inside stroke #D1D5DB, text #374151, shadow 0 1 2 rgba(0,0,0,.05). No icons. Footer gap 10 between them.
- **Primary buttons have no shadow at all** (gradient, flat blue, red; page, modal and pill). Only bordered secondaries keep shadow-xs (user, 2026-10-26).
  Code: `OBModal.BUTTON` = secondary base (with shadow-xs), `OBModal.BUTTON_BASE` = filled primaries (no shadow), `OBModal.PRIMARY_BUTTON_MD` / `SECONDARY_BUTTON_MD` = size md (Review and agree).
- The **56 gap above the CTA also applies to Change Allocation and Dispute** (multi-party), at every breakpoint (user, 2026-10-26). Figma: Spacer fixed 24 (16+24+16). Phone frames hug so the gap is exactly 56. Tablet/desktop 4.1 frames keep the CTA bottom-anchored, so the gap is at least 56 (user, 2026-10-26).
- 8.13 Bank Summary title stays all Semi Bold, as in Figma (user, 2026-10-26).
- Secondary buttons keep the design-system 0 1 2 rgba(0,0,0,.05) shadow (it is not the glow). The "Change" pill in the Current Allocation card keeps its pill radius (user, 2026-10-26).
- Change Allocation (m) frames: the gap above the CTA is exactly 56, matching code (user, 2026-10-26).
- **Disabled secondary buttons have no shadow**, and the Review and agree md Cancel has no shadow, as in Figma/library (user, 2026-10-26). Enabled 56px secondaries keep the 0 1 2 shadow. Code: `disabled:shadow-none`; `SECONDARY_BUTTON_MD` has no shadow.
- Don't change library components (SMART System) for SD-only fixes. Override locally in the SD file.

## Usage budget (all agents and the coordinator)

Adapted from the suite `usage-budget` skill. Quality comes first: if a cheaper setup misses things, go back.

- **Models:** `sd-qa` and `sd-flow-mapper` run on `sonnet` (set in their files). `sd-figma` and `sd-sandbox` stay on the default model. Trial started 2026-10-26: if QA on sonnet misses discrepancies, move it back.
- **Figma MCP has a per-seat call limit.** Batch reads and writes into few `use_figma` scripts (one page-wide scan beats many small calls). In QA, do the Figma checks first. Screenshots only of what is being checked, ≤ 1000 px.
- **No Figma calls** while the work is code-only.
- **Briefs:** exact files, node ids, target values and an expected report length (≤ 40 lines). Reports: tables and numbers, no file dumps.
- **Reuse agents:** a follow-up on the same area goes to the agent that just did it (SendMessage); a new topic gets a new agent. One agent per Figma page or file at a time.
- **≤ 3 tool calls?** The coordinator does it inline, no agent.
- **Hand-off notes:** after a milestone (pushed batch, finished section), write `.claude/handoff/sd-<YYYY-MM-DD>.md` with: done, open jobs (files / node ids), decisions waiting, next step. A new session starts from the latest note instead of a long conversation.

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
- **Cell height is 40px everywhere**: phone, tablet and desktop, on Current Allocation and Payment Status alike (user decision, 2026-10-21).
  - Figma: the Expiration cell has padding 10/10 (its INSIDE stroke does not count). How it works has 10/10, or 9/9 when it carries the transparent stroke, because that stroke counts (strokesIncludedInLayout). The phone (i) button is fixed at 40.
  - Code: bordered badges `py-[9px]` + 1px border, the borderless badge `py-2.5`.
- Bordered Expiration cells have a 1px INSIDE stroke, so the How it works frame next to them gets the same stroke, transparent (opacity 0). Without it Figma makes the row 2px unequal (user wants them exactly equal, 2026-10-21).
- **Tooltips** (Copy/Copied): centred above the copy icon, top = icon.y − 36 (the desktop rule).
- **Closed screens** (Page/Card style) are cloned from the **desktop** frame and resized.
- **Mobile Menu:** dropdown panel x16 y56 736×108, close button at x720 y16.

## Flow arrows (Figma)

- Real connectors, attached at both ends (never vectors). ELBOWED, stroke 2, corner radius 24, blue `#2563EB`.
  Arrowhead only at the target. Label Onest Bold 32, white on blue.
- Enter the target screen through its TOP (Content/Container/Overlay). A side entry is allowed when
  stacked targets leave no room.
- One lane per arrow. Lines may cross, but never overlap and never pass over a screen.
- **6.1 Payment Status is the only status section with internal arrows** (user decision, 2026-10-26). 7.1, 8.1 and 9.1 have the same structure and do not repeat them, not even the entry from Sign (6.15 → N.1.0) or Continue → N.2.0. 6.1 is the reference.
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
