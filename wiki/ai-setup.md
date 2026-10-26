---
title: AI setup (Claude Code)
type: guide
status: draft
last_reviewed: 2026-10-26
---

# AI setup

How coding agents (Claude Code and others) work in this repo — the same setup as the GEAP project.
Goal: agents build with **our** components and tokens, and use as little of everyone's usage as possible.

| File | What it does |
|---|---|
| `CLAUDE.md` | Rules every session loads: source-of-truth order, "reuse before you build", definition of done, never push to main. |
| `.claude/skills/components/SKILL.md` | Inventory of existing components and shared modules with exact markup. Agents copy from here. |
| `.claude/skills/design-system/SKILL.md` | Tokens: text roles (`type-*`), semantic colours (`text-secondary`, `bg-brand`…), spacing, radius, dark mode. |
| `.claude/skills/usage-budget/SKILL.md` | Model per job, tight briefs, few Figma calls, hand-offs. |
| `.claude/handoff/` | One note per milestone so a fresh session doesn't re-read old conversations. |
| [Design tokens](design-system/tokens.md) | Full Figma ↔ code token table. |

## Source of truth, in order
1. Components skill — exact markup of what exists.
2. Design-system skill — token values.
3. Figma — layout and composition only.

If a shipped screen and the docs disagree, the screen wins and the doc gets fixed.

## For people
- Found a component that isn't in the inventory? Add it (or ask the agent to) in the same pull request.
- New token or text role? Add it in Figma (SMART System) first, then regenerate the code tokens.
- Long Claude session getting slow? Ask it to write a hand-off note, then start fresh.
