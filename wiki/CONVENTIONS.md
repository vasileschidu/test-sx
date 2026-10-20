---
title: Conventions
type: guide
status: draft
last_reviewed: 2026-10-17
---

# Conventions

## Product IDs

Use these exact IDs in folder names, frontmatter and cross-references.

| Product | ID |
|---|---|
| SMART Hub | `smart-hub` |
| SMART Enroll | `smart-enroll` |
| SMART Exchange | `smart-exchange` |
| Consumer Portal | `consumer-portal` |
| SMART Disburse | `smart-disburse` |
| SMART Collect | `smart-collect` |

## Versions

- Each product is versioned **independently** as a release: `R1`, `R2`, `R3`…, optionally with a
  minor number: `R1.0`, `R1.1`.
- The **standard** version is the latest release on `main`.
- In frontmatter, always quote it: `version: "R3"`, `based_on: "R1.0"`.
- Every new release gets an entry in `products/<product>/changelog.md`.
- TODO(confirm): is `R1` the same as `R1.0`? Should we always write the minor number?
- Figma files use the same `[R<n>]` tags. TODO(confirm): do Figma release tags match code releases? (Figma Hub AP is `[R2]`, code Hub is `R1.0`.)

| Product | Latest standard |
|---|---|
| smart-hub | R1.0 |
| smart-enroll | R1 |
| smart-exchange | R3 |
| consumer-portal | TODO |
| smart-disburse | R3 |
| smart-collect | R1 |

## Clients

- Clients are identified by a code: `c001`, `c002`… Codes are never reused.
- **`c000` is reserved for the worked example.** It is not a real client. Agents ignore it except as a pattern.
- No real names anywhere in the wiki (see [AGENTS.md](AGENTS.md#4-confidentiality)).
- One git branch per client: `client/<code>` (e.g. `client/c001`). One branch covers all
  products that client uses.
- The demo businesses in the code (`src/scripts/app-plans.js`: ABM Corp, Big Kahuna Burger Ltd,
  Johnny Anderson) are fictional prototype data, not clients.

## Branch or plan?

The Portal family has a **plans and capabilities** system (`src/scripts/app-plans.js`). It decides
which modules a business sees: `enabled`, `locked` (Upgrade badge) or `hidden`.

- Showing or hiding an **existing** module for a client → plan configuration. Record it as a `[config]` delta.
- **New or changed behavior** for one client → client branch (`client/<code>`). Record it as a variant delta.
- TODO(confirm): is the plan system meant to carry client configuration in production, or only demo views?

## Branch model (code repo)

The wiki lives in `/wiki` of the suite repo. Code paths in the wiki are relative to the repo root
(e.g. `src/pages/dashboard/bills-and-payables.html`).

```
main                 ← standard: latest version of every product
client/c001          ← client c001: standard at some point + c001's customizations
client/c002          ← …
```

Other branches (personal sandboxes such as `vlad-sandbox`, experiments such as `figma-match`, `revamped-version`) are **not** client branches. Do not document them as variants.


A client branch can be behind `main` for some products. That is why each variant records
its own `based_on` version per product.

## Variants

A **variant** = one client's customizations to one product.
File: `products/<product>/variants/<code>.md`. Template: [templates/variant.md](templates/variant.md).

Each delta is one bullet with a category tag:

| Tag | Meaning |
|---|---|
| `[layout]` | Visual or structural UI difference |
| `[flow]` | Different steps, rules, or business logic |
| `[feature]` | Added or removed capability |
| `[integration]` | Different connection to another product or an external system |
| `[content]` | Copy, labels, branding-neutral text changes |
| `[config]` | Same code, different settings |

## Status values

| Field | Values |
|---|---|
| Page `status` | `draft` (unverified) · `reviewed` (a human confirmed it) |
| Variant `variant_status` | `active` · `upstreamed` (now part of standard) · `retired` |
| Variant `upstream_candidate` | `no` · `maybe` · `yes` |
| Decision `decision_status` | `proposed` · `accepted` · `superseded` |

## Frontmatter

Every page starts with YAML frontmatter. Common fields:

```yaml
title: <human title>
type: guide | suite | product-overview | standard | changelog | variant | client | decision
status: draft | reviewed
last_reviewed: YYYY-MM-DD
```

Extra fields per type are in each template under [templates/](templates/).

## Wiki viewer

- `src/pages/wiki/index.html` renders these Markdown files for humans. Navigation comes from `wiki/manifest.json`.
- Links: use relative links to `.md` files (and `#heading-id` anchors). The viewer turns them into its own routes.
- Diagrams: fenced ```mermaid blocks render as diagrams.
- The Markdown files stay the source of truth. Do not put content in the viewer.

## Markers

- `TODO:` content still missing or unconfirmed. Say what is needed.
- `TODO(confirm):` there is a guess on the page, and it needs confirming.
