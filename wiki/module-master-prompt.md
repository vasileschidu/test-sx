---
title: Master prompt — module to wiki to Jira
type: guide
status: draft
last_reviewed: 2026-11-17
---

# Master prompt: Figma module → Wiki → Jira backlog

Copy everything below the line into Claude Code, opened in the `test-sx` repo.
Fill in the 5 parameters at the top. One module per run.
The run is split into batches. Each batch works on its own until it finishes, then stops at a gate for a human to check.
Say **"continue"** to start the next batch.

---

## Parameters

```
MODULE_NAME    = Card Manager
MODULE_ID      = card-manager                      # kebab-case, used for files, branch, Jira label
PRODUCT_ID     = smart-hub                         # from wiki/CONVENTIONS.md
FIGMA_URL      = https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/-REVIEW--VC-%7C-ICCP---Line-of-Credit-Cards?node-id=10671-65397
JIRA_PROJECT   = TCDM                              # earlier Card Manager work: TCDM-4324, TCDM-4340, TCDM-4486
```

### Product mode (a whole product, e.g. SMART Enroll)

Use this when the Figma file is a **separate product** rather than one module inside Hub. Everything below still
applies; only these parts change:

```
MODULE_NAME    = SMART Enroll                      # the product name
MODULE_ID      = smart-enroll                      # = PRODUCT_ID
PRODUCT_ID     = smart-enroll
FIGMA_URL      = https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28400-43229
JIRA_PROJECT   = TCDM
MODE           = product
```

- **Batch 1:** inventory **every flow page** of the file (pages starting with `↳`), not one node. Use one `use_figma`
  call per page (in parallel) that returns each frame's visible text, deduplicated, instead of screenshots of every
  frame; screenshot only one frame per distinct layout. Read the file's unresolved comments too: they often hold
  decisions that are not drawn yet.
- **Batch 2:** one wiki file **per area** (sign-in, application shell, each tab, submission, statuses…) under
  `wiki/products/<PRODUCT_ID>/flows/<area>.md`, plus `standard.md` as the index (capabilities, screens, statuses,
  links to the area pages). Two people never edit the same area page.
- **Batch 3:** Story 0 creates the product's own folder (`src/pages/<PRODUCT_ID>/`, `src/scripts/<PRODUCT_ID>-*.js`,
  `src/data/<PRODUCT_ID>*.json`) and the shared shell for that product (layout, nav); it is the only story that touches
  shared files. Each area's stories own that area's page and script.
- **Batch 4:** one Epic per product release (`<Product> (R1)`), optionally one Epic per add-on.

## Goal

Turn the **MODULE_NAME** design into:
1. A wiki page that fully describes the module: screens, fields, states, rules and open questions. It is the single source of truth for people and AI agents.
2. A Jira backlog built from that page: one Epic, plus Stories that each have context, acceptance criteria and a file scope.

Several people (and their AI agents) must be able to build different stories, and different modules, at the same time **without merge conflicts**.

## Ground rules (apply to every batch)

- Read first, in this order: `CLAUDE.md`, `wiki/AGENTS.md`, `wiki/CONVENTIONS.md`, `wiki/products/<PRODUCT_ID>/overview.md` + `standard.md`, `wiki/design-system/figma-files.md`, `.claude/skills/components/SKILL.md`, `.claude/skills/usage-budget/SKILL.md`.
- Work on a branch from `main`: `wiki/<MODULE_ID>`. Never push to `main`. Open a PR at the end of the wiki batches.
- No real client names (client codes only). No people's names in the wiki.
- Don't make up behaviour. Anything you cannot see in Figma, or that is ambiguous, becomes a `TODO(confirm): …` line, and the open-questions list collects them all.
- Figma is the source for **layout and content only**. For UI, map every element to an existing component in the components skill. If nothing fits, mark it **NEW COMPONENT**.
- Figma: `FIGMA_URL` is an Agile Partners file, so use the `figma-b` connection. Spend calls carefully: one `get_metadata` for the tree, then `get_screenshot` per screen. Call `get_design_context` only where screenshot text is unreadable. Cache what you learn in the hand-off file so later batches don't call Figma again.
- After each batch, write or update `.claude/handoff/<YYYY-MM-DD>-<MODULE_ID>.md` with: what was done, node ids, decisions, open questions, and the next batch. If the session runs out of context, a fresh session continues from that file.
- Finish every batch with a short report (what you produced, what you're unsure of) and **STOP**.

---

## Batch 1: Figma inventory (read-only)

1. Parse the file key and node id from `FIGMA_URL` (replace `-` with `:` in the node id).
2. `get_metadata` on the node. List every top-level frame: name, node id, size and what kind it is (screen, modal, drawer, state variant, flow arrow, annotation, or old/duplicate).
3. Group the frames into **screens** and **flows**: entry point → steps → exit or success. For each screen, note its variants: empty, loading, error, filled, disabled, and role or permission differences.
4. Screenshot each distinct screen (not duplicate variants). For each one, extract:
   - Title, tabs, filters and table columns (exact labels), with column formats and sorting.
   - Every field: label, type, required or optional, placeholder, helper text, validation, error text.
   - Every action: button or link label, what it does, where it leads, and whether it has a confirmation.
   - Badges and statuses, and their colours.
   - Annotations and sticky notes. Copy them **verbatim**, because they are often business rules.
5. Flag duplicates and conflicts, for example two versions of the same screen, or frames marked old or WIP. Pick which one is current and say why.
6. Write all of this to the hand-off file as an inventory table. **Stop.**

**Gate:** the human confirms which frames are in scope and which are current.

## Batch 2: Wiki module page

Each module gets **its own file**, so two modules never edit the same page:

`wiki/products/<PRODUCT_ID>/modules/<MODULE_ID>.md`

Use this frontmatter:
```yaml
---
title: <MODULE_NAME>
type: module
status: draft
last_reviewed: <leave as is; humans set it>
product: <PRODUCT_ID>
module: <MODULE_ID>
version: "R1"
figma: <FIGMA_URL>
jira_epic: TODO            # filled in Batch 5
source: drafted from Figma <file key> node <id> on <date>; needs human review
---
```

Use these sections, in this order. Keep them short and factual, and prefer tables to prose:

1. **Purpose.** What problem the module solves, in 2–3 lines.
2. **Users and roles.** Who uses it and what each role can see and do (permissions matrix).
3. **Entry points.** Nav item (`src/data/nav.json` id `<MODULE_ID>`), deep links, links from other modules.
4. **Screens.** One subsection per screen, each with:
   - Figma node id and link.
   - Layout family (from `wiki/suite/layouts.md`).
   - A components table: element → existing component in the components skill, or **NEW COMPONENT**.
   - Tables of fields, columns and actions (exact labels), as extracted in Batch 1.
   - States: empty, loading, error, success, disabled.
5. **Flows.** Numbered steps per flow: happy path first, then alternative and error paths.
6. **Business rules and validations.** Numbered `BR-1`, `BR-2`, … so Jira can reference them.
7. **Data.** The entities and fields the UI needs, with a proposed `src/data/<MODULE_ID>.json` shape.
8. **Integrations.** Links to other products and modules. Also update `wiki/suite/integrations.md` if this crosses products.
9. **Out of scope.**
10. **Open questions.** Every `TODO(confirm)`, numbered `Q-1`, `Q-2`, …
11. **File ownership.** The files this module owns, so stories don't collide:
    - `src/pages/dashboard/<MODULE_ID>*.html`
    - `src/scripts/<MODULE_ID>*.js`
    - `src/data/<MODULE_ID>*.json`

    List separately the **shared** files the module needs to touch, such as `nav.json`, `nav-component.js`, shared components and `design-tokens.js`.

Then:
- In `wiki/products/<PRODUCT_ID>/standard.md`, change the module row's "Documented" column to a link to the new page. That is the only edit to that file.
- Add the page to `wiki/manifest.json`.
- Add a changelog entry in `wiki/products/<PRODUCT_ID>/changelog.md`.
- If `modules/` is a new folder pattern, add decision record `wiki/decisions/000N-module-pages.md`, explaining that it uses one file per module to avoid conflicts.

Commit, push the branch and open a PR. **Stop.**

**Gate:** the product owner or designer reviews the PR and answers the open questions. The wiki is merged before any Jira tickets are created.

## Batch 3: Backlog draft (no Jira writes yet)

Plan the backlog from the **merged** wiki page. Write it to `wiki/products/<PRODUCT_ID>/modules/<MODULE_ID>-backlog.md` and add that file to the manifest.

Structure:
- **Epic:** `<MODULE_NAME> | <PRODUCT short name>`, with the purpose, a link to the wiki page and the Figma link.
- **Story 0, "Module scaffold":** the *only* story that touches shared files. It adds the nav link, an empty page shell using `<app-nav>`/`<app-topbar>`, the data file and the script stub. Every other story depends on it.
- **Shared component stories:** one per **NEW COMPONENT**. Each adds the component to `.claude/skills/components/SKILL.md`. These go before the stories that use them.
- **Feature stories:** one per screen or flow, sized for 1–3 days. Split big screens by area, for example table, filters, details drawer, and actions plus modal.

Each story uses this template, which other people and their AIs will read as-is:

```
Title:        [<MODULE_ID>] <Screen/flow> — <what>
Type:         Story            Label: <MODULE_ID>   Epic: <epic>
User story:   As a <role>, I want <capability>, so that <outcome>.
Context:      2–4 lines + links: wiki section anchor, Figma node link, related BR-n.
Scope (files): owns: …   touches shared: none | <file> (why)
Reuse:        components from the components skill to use (by name).
Acceptance criteria (Given / When / Then, numbered AC-1…):
  - functional behaviour, one AC per rule (reference BR-n)
  - every state: empty, loading, error, disabled
  - validation messages, exact text
  - dark mode for every state; keyboard + focus-visible; responsive 375 / 768 / 1280
Out of scope:  …
Dependencies:  Story 0, <component story>, Q-n must be answered
Definition of done: CLAUDE.md "Definition of done (UI)" — qa:code + qa:hover --dark with 0 major findings,
                    `?v=` bumped, wiki updated if behaviour changed, PR linked to the ticket.
Branch:       feature/<JIRA-KEY>-<short-slug>      Blocked by: <keys>
Claude Code prompt (a code block the developer pastes as-is), always with these steps:
  1. git fetch origin && git checkout main && git pull; check the blocking tickets are merged
     (git log --oneline origin/main | grep -E "<KEY>|<KEY>") — if not, STOP and tell me.
  2. git checkout -b feature/<JIRA-KEY>-<slug> (never work on main).
  3. Read CLAUDE.md, the module wiki section, the components + design-system skills, the ticket ACs.
  4. Build: <what to build, which existing components to reuse>.
  5. Only edit <owned files>; anything else → STOP and ask (needs its own ticket).
  6. Verify: tools/serve.py, qa:code + qa:hover --dark (0 major), every AC, light + dark,
     375 / 768 / 1280, keyboard, no console errors, bump ?v=.
  7. Before the PR: git fetch origin && git rebase origin/main; conflicts in files you don't own →
     STOP and ask; re-run step 6.
  8. Commit "<KEY>: …", push, PR titled "<KEY> <story>" with AC checklist + screenshots; do NOT merge.
  9. Wiki changed? Update your section in the same PR; list remaining TODO(confirm).
```

**Stop.**

**Gate:** the human approves the backlog file: the split, the order and the acceptance criteria.

## Batch 4: Create the Jira tickets

1. Use the Atlassian connector (`agilepartners.atlassian.net`). Search `JIRA_PROJECT` for existing tickets on this module, such as `text ~ "<MODULE_NAME>"`, and list them. Reuse or link them; don't duplicate.
2. Check which issue types and required fields the project has before creating anything.
3. Create the Epic, then the Stories in backlog order, each linked to the Epic and labelled `<MODULE_ID>`. Add "is blocked by" links for dependencies. Put the template content into the description, formatted as Markdown.
4. Write each Jira key back into the backlog file and into the wiki frontmatter (`jira_epic`). Commit on a new branch and open a PR.
5. Report a table of key → title → dependencies. **Stop.**

## Batch 5: Working rules to avoid conflicts (put in the Epic description)

- One branch per ticket: `feature/<JIRA-KEY>-<short-slug>`, from the latest `main`. One PR per ticket.
- Only edit the files the ticket says it owns. A change to a shared file needs its own ticket.
- Rebase on `main` before opening the PR. Bump `?v=` only on your own scripts.
- If behaviour changes while building, update the module wiki page in the same PR. Only the sections you changed.
- New component? Add it to the components skill in the same PR, and say so in the ticket.
