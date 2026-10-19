---
title: 0001 — Wiki structure, standard vs variants
type: decision
status: draft
last_reviewed: 2026-10-17
decision_status: proposed
date: 2026-10-17
products: [suite]
superseded_by:
---

# 0001 — Wiki structure, standard vs variants

## Context
The suite has six products, versioned independently, with client-specific customizations made on
separate branches that are rarely merged back. Agents and humans need one place that shows the current
standard and every client's differences, without checking out client branches.

## Decision
- The wiki is Markdown with YAML frontmatter, in `/wiki` of the suite repo, so a code change and its wiki update can ship in one PR.
- Each product documents its **standard** (latest on `main`) in full.
- Client customizations are recorded only as **deltas** in `products/<product>/variants/<code>.md`,
  each pinned to the standard version it is `based_on`.
- One code branch per client (`client/<code>`). Wiki changes always go to `main`.
- Clients are referred to by code only; `c000` is the worked example.
- Versions are per product releases (`R1`, `R1.0`, `R3`).
- Agents propose wiki changes; humans approve.

## Consequences
- Every code change on a client branch needs a matching variant update on `main`.
- "How far behind is client X" = compare `based_on` with the latest standard.
- Upstreaming a delta is a human decision. When it happens, the variant delta is removed and the
  standard's changelog records it.
