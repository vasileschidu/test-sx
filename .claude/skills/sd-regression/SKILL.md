---
name: sd-regression
description: Catch unintended visual changes in the SMART Disburse onboarding — from colleagues' commits (shared checkbox, scripts, styles) or from our own work. Lists which commits reach SD pages, then screenshots every SD page and dialog before/after at 375/768/1280 and shows only what changed. Use at the start of the day, before taking in origin/main, before pushing, or when asked "what did <colleague> change that affects SD".
---

# SD regression: what changed on the SD screens, and who changed it

Three scripts in `scripts/`, run from the repo root. Outputs go to the session scratchpad (`--tmp`), never the repo.

| Script | Does |
|---|---|
| `changes.mjs` | Finds the changes that reach SD (commits or uncommitted work) and, with `--visual`, renders before/after and diffs |
| `snapshot.mjs` | Screenshots every state in `states.json` (32 pages + 9 dialogs) at the chosen widths |
| `compare.mjs` | Diffs two snapshot folders; writes `report.html` (before / after / diff) and `summary.json` |

## 1. Which changes reach SD

```bash
node .claude/skills/sd-regression/scripts/changes.mjs                          # colleagues' commits on origin/main not in HEAD yet
node .claude/skills/sd-regression/scripts/changes.mjs --since "7 days"         # colleagues' commits already in HEAD
node .claude/skills/sd-regression/scripts/changes.mjs --since "14 days" --author alina
node .claude/skills/sd-regression/scripts/changes.mjs --commit 8401e41         # one commit, anyone's
node .claude/skills/sd-regression/scripts/changes.mjs --local                  # my uncommitted changes
```

"Others" = any author whose email is not `git config user.email`. The SD file set is every onboarding page plus every
local file those pages load (and one level into the scripts they load). Per file it says:
- **SD**: only SD pages load it → ours to change.
- **SHARED**: a dashboard/other page loads it too → **report to the owner, don't change it** (sd-design-rules scope).

## 2. What it looks like (visual)

Add `--visual --tmp <scratchpad>/<name>` to the default mode, `--commit` or `--local`:
- default: worktree **HEAD** vs worktree **HEAD + origin/main merged** (not committed). A merge conflict stops it and lists the files.
- `--commit X`: X's parent vs X.
- `--local`: HEAD vs this working tree.

Only the states whose page loads a touched file are rendered (`--all` for every state). `--widths 375` for a fast check;
the default is 375,768,1280. Timing: about 3.5 s per shot with 4 Chrome jobs, so all 41 states × 3 widths take about 6 min.
Worktrees are created in `--tmp` and removed afterwards (`git worktree list` should show only the repo).

Read the result:
1. The console lists the changed shots, largest first, with the changed box `x,y,w,h`.
2. Open `<tmp>/diff/report.html` or `Read` `<tmp>/diff/<shot>.diff.png` (the after image, faded, with the changed pixels in red),
   and `<tmp>/shots-before|after/<shot>.png`.
3. Say what changed in words ("the Verification consent checkbox: new size and label colour"), not just the percentages.
4. `! … redirected` / `404` / `JS` lines mean a shot is not trustworthy. Fix the state in `states.json` or say so.

## 3. Your own snapshot pair

```bash
node .claude/skills/sd-regression/scripts/snapshot.mjs --out <tmp>/before [--base http://127.0.0.1:8091] [--widths 375] [--only welcome,confirm-identity.html] [--jobs 4]
node .claude/skills/sd-regression/scripts/compare.mjs --a <tmp>/before --b <tmp>/after --out <tmp>/diff [--min 150] [--delta 24]
```

## How the noise is kept out (tested: two runs of unchanged code → 0–2 tiny flags)

- Each shot: fresh tab, storage cleared, seeded flow (`?flow=us` / `?flow=multi-party`) and preset state.
- Clock frozen at 2026-11-01 10:00, `Math.random` returns 0.5 (receipt IDs, the Confirm Identity channel), animations and transitions 1 ms.
- After the wait, also wait for network idle, images and fonts.
- The diff ignores 1-px anti-aliasing (neighbour match plus 2×2 block average) and changes under 150 px.
  A one-word text change is about 300 px, so it still shows.
- A leftover tiny flag (e.g. welcome@1280 at 0.01 %, a late icon) re-run with `--only <id>` before you report it.

## Adding states

When a page or dialog is added, add it to `states.json`: `id`, `path`, optional `flow` (`us`/`mp`), `pre` (preset or JS run
on the seed page), `wait`, and `steps` (`click` selector or `eval`) for dialogs. Dialog shots are taken at viewport height,
page shots at full height. Check the new state with `snapshot.mjs --only <id>` and look at the PNG.

## Reporting

- Colleague changes: commit, author, date, what it changed visually on which SD screens, SD vs SHARED. Recommend: fix on our side (SD files) or ask the owner (SHARED files). Change nothing until Andrian decides.
- Our changes: list every changed shot and confirm each one was intended. An unintended one is a regression; fix it before pushing (see `sd-ship`).
