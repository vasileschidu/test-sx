---
title: Templates
type: guide
status: draft
last_reviewed: 2026-10-20
---

# Templates

Copy a template when you create a new page, then add the page to [manifest.json](../manifest.json)
so it shows in the wiki viewer.

| Template | Use for | Goes in |
|---|---|---|
| [variant.md](variant.md) | One client's customizations to one product | `products/<product>/variants/<code>.md` |
| [client.md](client.md) | A client's overview: products, releases, variants | `clients/<code>.md` |
| [decision.md](decision.md) | Why something was decided | `decisions/NNNN-short-title.md` |
| [changelog-entry.md](changelog-entry.md) | A new standard release | top of `products/<product>/changelog.md` |
