---
name: handoff
description: Save the session's working context to today's hand-off note (.claude/handoff/<YYYY-MM-DD>.md) so a new or compacted session can continue — what was done, decisions taken, open items, files and node ids. Use every hour (via /loop 60m /handoff), after a milestone, before /clear, and when a SessionStart reminder says the context was compacted.
---
# Hand-off note

Goal: anyone (a new session, a compacted one, a colleague) reads one file and knows where the work stands.

## Write
File: `.claude/handoff/<today YYYY-MM-DD>.md` (create if missing). Keep it under ~80 lines; update in place —
replace the "Current state" section, don't append a new copy every hour. Leave `## Auto snapshot` blocks
(written by the PreCompact hook) at the bottom; delete all but the latest one.

```
# Hand-off <date> — <one-line focus>

## Current state (updated HH:MM)
- Focus: <page / feature>
- Done today: <bullets, newest first, each with file or node id>
- Decisions (by Andrian): <bullets with date — these are product truth>
- Open / next: <bullets, ordered>
- Waiting on: <people, Figma links, answers>

## Key files / ids
- <path:line or Figma file+node> — why it matters

## Not committed / not pushed
- <summary of git status; which changes belong together>
```

## Rules
- Facts only, from this session: what was changed, verified (how), decided, left open. No guesses.
- Product decisions also go to the wiki / components skill as usual; the note only points to them.
- Use `git status --short` and `git log --oneline -5` for the git section; don't paste diffs.
- No real client names (client codes only).
- One short line back to the user: "Hand-off updated: <path>". Don't print the note.

## Retention (Andrian, 2026-11-19)
- Keep notes from the last 7 days in `.claude/handoff/`. When writing, move any note whose name starts with
  or contains a date older than 7 days (daily `YYYY-MM-DD.md` and named ones like `sd-YYYY-MM-DD.md`) to
  `.claude/handoff/archive/` (`git mv` if tracked). Never delete. `README.md` and undated notes stay.

## After compaction / new session
Read today's note (and yesterday's if today's is missing) before answering; continue from "Open / next".
