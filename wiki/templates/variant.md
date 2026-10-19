---
title: <Product> — variant <code>
type: variant
status: draft
last_reviewed: YYYY-MM-DD
product: <product-id>          # e.g. smart-hub
client: <code>                 # e.g. c001 — never a real name
branch: client/<code>
based_on: "R<n>"             # standard release this variant diverged from
variant_status: active         # active | upstreamed | retired
upstream_candidate: no         # no | maybe | yes
---

# <Product> — variant <code>

Behavior = standard <based_on> ([standard.md](../standard.md), [changelog](../changelog.md)) **plus** the deltas below.

## Deltas vs standard <based_on>

- `[layout]` …
- `[flow]` …
- `[integration]` …

## Not present on this variant

Standard features added after <based_on> that this client does **not** have yet:

- …

## Upstream notes

Only if `upstream_candidate` is `maybe` or `yes`: which delta(s) and why they may be useful in standard.
