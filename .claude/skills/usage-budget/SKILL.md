---
name: usage-budget
description: Keep Claude usage low in this repo — which model each agent job gets, how to brief and batch work, how to use the Figma MCP sparingly, and when to hand off instead of continuing a long session. Use before launching any agent, before Figma work, for mechanical jobs (renames, sweeps, audits), or when the user asks about limits or usage.
---

# Usage budget (SMART prototype + Figma)

Same rules as the GEAP project, adapted here. Every turn re-sends the whole session, so the
cheapest token is the one never loaded.

## 1. Model per job (pass `model` on the Agent call)

| Job | Model |
|---|---|
| New flow / new module / design decisions / tricky refactor or merge | default (opus) |
| Mechanical code: copy edits, one CSS value, a `?v=` bump, a known-cause bug | `sonnet` |
| Mechanical Figma: renames, token rebinding, status changes, hug/height fixes | `sonnet` |
| Audits, QA, research summaries, per-file Figma audits | `sonnet` |
| Read-only lookups (find a node, count, read one file) | `haiku` or inline |

Unsure → `sonnet`; escalate only if the result is wrong.

## 2. Read less
- Load only the skill you need: `components`, `design-system` — not whole scripts.
- The giant scripts (`exchanges-table.js` 10k lines, `payables-pay.js` 8k, `consumer-exchanges-table.js` 8k)
  are never read whole: `grep -n` for the function, then read that range.
- `wiki/` pages and `.claude/handoff/` notes beat re-reading old conversations.

## 3. Brief agents tightly
- Give exact files, line ranges, node ids, and target values.
- Point at existing tools (`~/figma-audit/tools/*`, the token generator) instead of asking to rebuild them.
- One agent per file / Figma page at a time. Ask for ≤ 15-line reports with links.
- Follow-ups on the same area: `SendMessage` the finished agent; new topic: new agent.

## 4. Figma MCP
- Batch writes into few `use_figma` calls; screenshots ≤ 1000 px and only of what's being checked;
  structure via `get_metadata` / the REST inventory (`~/figma-audit/files/*.json`), not screenshots.
- No Figma calls while the work is code-only.

## 5. Sessions and hand-offs
- After a milestone (merged branch, finished module), write `.claude/handoff/<YYYY-MM-DD>.md`:
  open jobs, files / node ids / scripts, pending decisions, next step. Then suggest `/clear`.
- Stop background servers and agents you no longer need.

## 6. Before launching an agent
1. ≤ 3 tool calls inline? Do it inline.
2. Mechanical? `sonnet`.
3. Someone already on that file / page? Queue it.
4. Prompt has ids, paths, expected report length?
