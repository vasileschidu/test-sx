---
title: Instructions for agents
type: guide
status: draft
last_reviewed: 2026-10-17
---

# Instructions for agents

Rules for any coding agent that reads or proposes changes to this wiki.
Humans approve all changes; you propose them.

## 1. Reading order

The wiki lives in `/wiki` of the suite repo. Code rules are in `PROJECT_RULES.md` at the repo root.

Before working on any product:

1. [suite/overview.md](suite/overview.md): what the suite is.
2. `products/<product>/overview.md`: purpose, users, layout family, dependencies.
3. `products/<product>/standard.md`: the **current standard** behavior. This is the default truth.
4. [suite/integrations.md](suite/integrations.md): if your change touches data or flows
   that cross into another product.
5. [suite/layouts.md](suite/layouts.md), [design-system/](design-system/README.md) and [figma-files.md](design-system/figma-files.md): if your change touches UI. Figma has many conflicting copies, so use the source-of-truth file.

## 2. Standard vs client variants

- **Standard is the default.** Unless your task explicitly targets a client, work against standard
  and ignore `variants/`.
- **Working on a client branch** (`client/<code>`, see [CONVENTIONS.md](CONVENTIONS.md)):
  1. Read `clients/<code>.md`.
  2. Read `products/<product>/variants/<code>.md` for each product you touch.
  3. Behavior = standard at the variant's `based_on` version **plus** the listed deltas.
     Do not assume features added to standard after `based_on` exist on that client.
- **Never** carry a client delta into standard on your own. If a delta looks generally useful,
  set `upstream_candidate: yes` in the variant file and explain why. Humans decide.

## 3. Treat unverified content as unverified

- `status: draft` on a page, or any line marked `TODO`, means the content is not confirmed.
- Do not build on a TODO as if it were fact. Ask a human, or say in your output that you relied on it.
- If you find the wiki contradicts the code, **the code reflects reality**. Propose a wiki fix and
  point out the contradiction. Do not silently pick one.

## 4. Confidentiality

- **Never write real client names**, people's names, or client-identifying details (domains,
  logos, contract terms). Use client codes only (e.g. `c001`).
- `c000` is a **worked example**, not a client (`example: true` in frontmatter). Never implement it.
- The mapping from code to real name is kept **outside** this wiki.

## 5. Proposing changes

Propose a wiki update in the same PR (or a linked one) whenever you:

| You changed… | Update |
|---|---|
| Standard behavior of a product | `standard.md` + new entry in `changelog.md` |
| Something on a client branch | `variants/<code>.md` deltas (+ `clients/<code>.md` if versions changed) |
| A cross-product flow or contract | [suite/integrations.md](suite/integrations.md) |
| A layout pattern | [suite/layouts.md](suite/layouts.md) |
| Something with a non-obvious "why" | A new record in [decisions/](decisions/README.md) |

## 6. Building UI shared across portals

- **Table filter:** use the shared filter. Do not build one inside a page script. Derive the categories from the table’s
  columns, label each one **exactly** like its column header, and show it only on tabs that have the column (whether or not it is switched on in Manage columns).
  When you add, remove or rename a column, update the filter **and** the per-portal table in
  [design-system/table-filter.md](design-system/table-filter.md).
- Before changing a top bar, filter, badge, activity log or Payment Preferences layout, check
  [portal-consistency.md](design-system/portal-consistency.md). If your change fixes a row, set its status to `fixed`.

Rules for edits:
- **Wiki changes always go to `main`**, even when they describe a client branch. Do not edit `/wiki` on client branches. Variant docs
  must be visible from `main`, so anyone can see every variant without checking out client branches.
- Keep the frontmatter valid (schemas in [CONVENTIONS.md](CONVENTIONS.md)).
- Use templates in [templates/](templates/) for new pages.
- **Add every new page to [manifest.json](manifest.json)**, otherwise it will not appear in the wiki viewer navigation or search.
- Update `last_reviewed` only if a human reviewed the page; otherwise leave it.
- Keep pages short and factual. Link instead of duplicating content.
