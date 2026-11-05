---
name: sd-ship
description: Ship SMART Disburse sandbox changes safely — scope check, bump the ?v= cache-buster on every page that loads a changed script/style, visual regression check against HEAD, commit, push to andrian-sandbox only, then hand over local links and a summary for Vasile. Use when Andrian says "fă push" / "push" / "ship", or before handing sandbox work over.
---

# sd-ship: from "it works on my screen" to pushed and handed over

Run from the repo root. Steps in order; stop and tell Andrian at any ⛔.

## 0. Preconditions

```bash
git branch --show-current          # must be andrian-sandbox
git fetch origin --quiet && git status -sb | head -1
```
- ⛔ Not on `andrian-sandbox`: stop. **Never push to `main`** (Vasile merges) and never force-push.
- Behind `origin/andrian-sandbox`: `git pull --rebase` first, and say so.

## 1. Scope check

`git status --short`, then sort every changed file:
- **SD**: `src/pages/onboarding/*`, `src/scripts/onboarding-*`, and the SD scripts only onboarding pages load
  (`card-created.js`, `review-documents.js`, `virtual-card*.js`, `bank-*.js`, `debit-*.js`, `check-*.js`, …).
- **Skills/agents**: `.claude/skills/*`, `.claude/agents/*`. These are fine to ship.
- ⛔ **Anything else** (dashboard pages, shared scripts such as `checkbox-component.js`, `shared.js`, topbar, `wiki/`, SD-UK): don't ship it.
  Tell Andrian what it is and why it changed. `changes.mjs --local` marks shared files as SHARED.

## 2. Cache-buster

```bash
node .claude/skills/sd-ship/scripts/bump.mjs --dry-run    # check the plan
node .claude/skills/sd-ship/scripts/bump.mjs
```
It sets one new stamp (`<today><next letter>`, e.g. `20261104a`) on every reference to each changed `.js`/`.css` in the
SD pages and SD scripts. It does **not** bump them in dashboard pages; those are reported as SHARED. A changed file that
"no SD page loads" is either dead or loaded dynamically, so check it.

## 3. Regression check (sd-regression)

```bash
node .claude/skills/sd-regression/scripts/changes.mjs --local --visual --tmp <scratchpad>/ship
```
This renders HEAD against the working tree for every SD state whose page loads a changed file (375/768/1280), and lists the changed shots.
- Look at each changed shot (`<scratchpad>/ship/diff/<shot>.diff.png`) and decide: **intended** or **regression**.
- ⛔ A regression: fix it and run the check again before going on. Don't push "to fix later".
- Also run `changes.mjs` (no flags) once. If origin/main has colleagues' commits that reach SD, mention them: Vasile
  will merge both, and a conflict is easier to solve now.

## 4. Commit

- Stage the files by name (`git add <files>`), not `git add -A`. Leave out stray files and anything ⛔ from step 1.
- Message style from the history: `Onboarding: <what changed, user-facing>` (≤ 72 chars), then a short body: why, and the
  pages or dialogs touched. Skill/agent-only commits: `Skills: …`. End with the attribution line from the system reminder.

## 5. Push

```bash
git push origin andrian-sandbox
```
Pushing is outward-facing. "fă push" / "push" from Andrian is the go-ahead for this push. If the skill was started
without that, show the commit summary and ask first.

## 6. Hand-over

Reply to Andrian (in his language) with:
1. The commit hash and a one-line summary.
2. Local links for the changed pages, served by his no-cache server on 8080: `http://localhost:8080/src/pages/onboarding/<page>.html`
   (add `?flow=multi-party` for MP pages, `?channel=email` for confirm-identity).
3. What the regression check showed: N shots changed, all intended (name them briefly).
4. **For Vasile**, a short block in English, ready to paste:
   ```
   andrian-sandbox @ <hash> — <title>
   What: <1–3 bullets, user-facing>
   Pages: <list>
   Checked: visual regression 375/768/1280, <n> intended changes, no others
   Shared files touched: none | <file — why, owner informed>
   ```
