---
name: sd-design-rules
description: Shared design and workflow rules for the SMART Disburse (SD) onboarding prototype and its Figma file. Load before any SD work in Figma or in the sandbox, and before QA comparisons. Single source of truth for breakpoints, sizes, layout and working rules.
---

# SMART Disburse: shared rules

These rules are shared by the `sd-figma`, `sd-sandbox`, `sd-qa` and `sd-flow-mapper` agents, and by the suite agents (`proto-engineer`, `figma-designer`, `ui-qa-code`, `ui-qa-figma`) whenever they work on SD. **On SMART Disburse they override** the suite skills `components` and `design-system` and `CLAUDE.md` where those disagree; elsewhere in the suite they don't apply. If you learn a new rule or the
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
- **Modal structure (user, 2026-11-03, final): Tailwind Plus pattern — the WHOLE modal scrolls.** Nothing inside the
  modal is pinned: X, content and buttons scroll together. Replaces the earlier "fixed header/footer, Content scrolls"
  version (rejected the same day).
  - **Figma (FINAL, user-built reference 2026-11-03: `EXAMPLE – Modal scroll reference (Catalyst-style)` `1545:94795`, since deleted; live reference with the identical structure: 4.12 desktop `959:25701`):**
    ```
    Modal & Background  absolute, STRETCH/STRETCH, VERTICAL, CENTER/CENTER, padding 0 top/bottom, 16 sides,
                        fill #000 @75% + background blur 5, clipsContent, overflowDirection VERTICAL  ← the only scroll
    └─ Modal Wrapper    transparent auto-layout, HUG width + height, padding 24 top/bottom, no clip
       └─ Modal         the white card: FIXED width (512; phone 343), HUG height, NO maxHeight,
                        clip (rounded corners), no scroll → Header / Content / Footer, all HUG, original look
    ```
    The wrapper's 24/24 is the gap above and below. Keep the backdrop CENTER: in the editor a tall modal shows
    spilling above the frame (negative y), but the prototype scrolls it top to bottom correctly (user-tested). Fits →
    centred; doesn't fit → the whole modal scrolls with 24 at both ends, like Catalyst and the sandbox. Do not put the
    scroll inside the Modal (previous version, replaced) and do not top-align the backdrop.
    **Exception (user-built on 6.6 desktop `1170:9894`, 2026-11-03): Review and agree (6.6/6.7, 7.12/7.13, 8.14/8.15,
    9.5/9.6) and the Document viewer (3.3/3.7/3.8/3.9) scroll ONLY inside the card**: `Modal & Background` (CENTER,
    padding **16 all round**, #000 @75% + blur 5, no clip, no scroll) > `Modal` (FIXED width, height **FILL, no maxHeight**:
    full height, 16 from every frame edge, since 2026-11-09), clip, no scroll, with the inner "Agreement (scroll)" /
    "Viewer" FILL + vertical scroll. No Modal Wrapper.
  - **Code:** `OBModal.open(body, labelledBy, { header, footer, bare, panelClass })`. The backdrop `[data-ob-modal]` is
    `fixed inset-0 overflow-y-auto`; `[data-ob-modal-frame]` is `flex min-h-full items-center justify-center px-4 py-6`;
    the panel keeps its natural height. Dialogs whose design has an inner scroller (Review and agree, document viewer)
    are full height: `panelClass` `relative flex h-[calc(100dvh-2rem)] w-full max-w-[1048px] flex-col overflow-hidden`,
    the frame's `px-4 py-6` swapped for `p-4` (16 on every side), and a `min-h-0 flex-1` body root
    (`onboarding-consents.js` openReview, `review-documents.js` openViewer; commit 0343e34). Open with `dialog.focus({ preventScroll: true })`, or the backdrop jumps and the 24 top gap is lost.
    Popups inside a dialog (Decline reason list) are `fixed`: the backdrop's blur makes it their containing block and it
    scrolls, so add `backdrop.scrollTop` to the top. A footer submit button needs `form="<id>"`. On a failed submit use
    `OBModal.revealField(field, errorEl)` so the error message scrolls into view too (sd-qa, 2026-11-03).

## Decisions from the full QA sweep (user, 2026-10-26)

- **Gap above the primary CTA is 56 at every breakpoint.** Done in Figma (2026-10-26): forms use Content `itemSpacing 56`; summary screens (Title/Groups/Consents/Footer) keep 40 between blocks and use Footer `paddingTop 16`. Fixed-height mobile frames grew by 16.
- The receipt date may wrap to two lines on Submitted screens ("… AM (ET)"). Leave it as is.
- On tablet, the Submitted / Card Created **action buttons are 608** wide (the full tablet content width). The receipt paper itself stays 302, as in Figma (t).
- Verification-failure revoke uses the Tokens "Request no longer available – Revoked" screen (`payment-closed.html`). The old centred `revoked.html` is retired.
- "See allocations log" on Change Allocation shows **only after a change exists** (code: `mp.log.length > 1`). Figma states before any change hide it.
- Choose Payment Method chips (Message / Expiration / Full details): **phone hugs** (103/110/114, centred); **tablet and desktop are FILL, equal** (197 / 180 each). Code: `md:flex-1`. (Corrected 2026-10-26 after the Figma (t) frame was re-checked.)
- The Dispute Message textarea is **88** tall.
- **Dispute Total Amount path removed (user, 2026-11-05).** Current Allocation has ONE CTA, "Accept and Continue", for every party. Figma: the Dispute button, the 4.7 confirmation modal and the whole "Dispute" subsection of section 4 (4.2.0 form, 4.2.1 thank you, 4.2.2 errors) were deleted; one-button layout = "4.2 Other party view" (phone/tablet frames 80 shorter than the old two-button ones, desktop CTA bottom-anchored). Don't re-add a Dispute button.
- **Decline Payment in multi-party → revoked, not disputed (user, 2026-11-09).** Decline Payment leads to `declined.html` ("access has been revoked") in every flow. Nothing in the UI leads to the "Disputed" closed screen any more (Figma `875:15636`, `875:15681`, t `1374:95688`; code `dispute.html`, `disputePage`, `OBFlow.dispute`): known orphan, don't report it in QA and don't wire Decline to it. The demo Scenario's Payment option is **Declined** (was "Disputed by primary party"): it stores an example decline and opens `declined.html`; confirming the real Decline dialog in multi-party sets the same state (`OBFlow.decline()`, `OBFlow.closedUrl()`). The 4.1.2 (m) missing Comment row vs sandbox is accepted (the comment design lives in "4.1 – Others accepted (with comment)").
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

## Dark mode (SD, 2026-11-09)

Dark mode came from main (Vasile, `theme-init.js`, `?theme=dark|light`, class-based `dark:` variant). Every SD change ships light + dark (CLAUDE.md). Light must stay pixel-identical when fixing dark: keep the light classes/hex and **add** a `dark:` twin; check light with `sd-regression --local --visual`.

- **Dark twins used in SD:** `text-[#111827]`→`dark:text-white`, `#374151`→`dark:text-gray-300`, `#6b7280`→`dark:text-gray-400`, `#2563eb`→`dark:text-blue-400`, `bg-[#f9fafb]`/`bg-white` (inner boxes)→`dark:bg-white/5`, borders `#e5e7eb`/`#d1d5db`→`dark:border-white/10`. Dialog panels `bg-white`→`dark:bg-gray-900` + `dark:ring-white/10`. Every hover/focus gets its dark twin (`dark:hover:bg-white/10`, `dark:focus-visible:outline-blue-400`).
- **SVG assets made for a white page break in dark:** a check cut out of a blue circle shows the page (looks black); a pale `#BFDBFE` halo glows; near-white grey lines glare; a white band shows. Fix = keep the `<img>` with `dark:hidden` and add a CSS element `hidden dark:block` (dots/bullets: blue-500, current `ring-4 ring-blue-500/30`, pending `bg-white/20`; separators: `border-white/15`), or a `-dark.svg` asset (receipt edge: page-colour bites, white/10 outline, no fill over an already white/5 body).
- **Translucent dark inputs (`bg-white/5`) show anything tucked under them** (e.g. the routing note with `-mt-2`): give the input wrapper the page colour underneath (`dark:bg-gray-900`).
- The routing note is a shade darker than the input in dark (`gray-950/25`), mirroring light (gray-50 tray under a white input) (user, 2026-11-09).
- Canvas ink can't use classes: read the theme from a rendered element (signature: title colour white → `#ffffff`, else `#111827`).
- Review and agree on SD summaries: `documentScroll: true` + `scrollToEnd: true` (one click to the end; SX keeps a page per click). Figma (light only) matches since 2026-11-09: the whole Body scrolls (`Agreement (scroll)` = transparent p-24 scroller), the grey box `Agreement` hugs the full document, and the not-at-end frames carry `Fade` (h128, white 0→100 %) + `Scroll down` (48 round, gray-100, 2px white inside stroke, shadow/md, heroicons-mini/arrow-down 24 gray-700, ON_CLICK → the at-end frame). No dark frames yet.
  Since 2026-11-09 (user) the Review and agree card is **full height, 16 from every frame edge** (sandbox `h-[calc(100dvh-2rem)]`): `Modal & Background` padding 16 all round, `Modal` FILL with no maxHeight (375×812 → 343×780, 768×1024 → 736×992, desktop 1048×992). The document viewer keeps 24 + maxHeight 752. The Terms text in Figma = `src/data/sd-virtual-card.json` agreements[0] (24 items; `## ` headings sit in a "Heading (pt-2)" frame with paddingTop 8, matching `agreementHtml`).
- QA in dark: `qa:hover --dark` flags the sidebar / Contact Us / labels as `dark-low-contrast` (1.2) because it reads the container's colour, not the text's. Known false positives (same count before and after a change), not a reason to edit. Compare before/after with a worktree on another port (`SX_BASE=http://127.0.0.1:8898`).
- `revoked.html` is a redirect stub to `payment-closed.html`; it needs no theme.

## Dialog spacing (sd-sandbox, 2026-11-09)

- Message dialogs (4.5 How it works…): "Learn more" sits 8 below the body text (no extra `mt-2`), Actions 24 below, Content padding 0/36/36/36.
- Faster dialog (8.17/8.18, 9.8/9.9): 512 wide at every breakpoint, title 16 below the X row, options 60 tall (`border-2` + `py-[18px] px-[14px]`), card 428.
- VC "How this works" (6.4 / 6.2.2): header 65 (`px-4 py-3` around the 32 close button), body copy is Figma 13 px auto line height → `text-[13px] leading-4`, 16 px labels `leading-5`, text gap 10. Bullets in Figma are inline "•  " text with no hanging indent → `list-inside list-disc` (no `pl-*`), or the phone list wraps one line more.
- Fixed-height Figma phone frames (e.g. 1.0 (m) Verification, 830) bottom-anchor the CTA block: compare at the frame height (`--h 830`), not 812, before calling a Δ≈18 a bug.

## Usage budget (all agents and the coordinator)

Adapted from the suite `usage-budget` skill. Quality comes first: if a cheaper setup misses things, go back.

- **Models:** `sd-qa` and `sd-flow-mapper` run on `sonnet` (set in their files). `sd-figma` and `sd-sandbox` stay on the default model. Trial started 2026-10-26: if QA on sonnet misses discrepancies, move it back. First run (post-merge check): correct overall, but it misread the layered `box-shadow` as no shadow on secondaries. The coordinator caught it by re-measuring. Spot-check sonnet QA claims that contradict known rules.
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
   - Sandbox: `sd-regression` (`changes.mjs --local --visual`) shows every SD screen your change touched, at all
     three widths. Each changed shot must be intended.
   - Figma: the prototype audit (`figma-sd-techniques` §4c) after any modal or prototype work.
   - Pushing goes through `sd-ship` (cache-buster, regression, commit, push to `andrian-sandbox`, hand-over).
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
