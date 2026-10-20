 R1 | R3 | TODO | R3 | R1 | R1.0 |---
title: SMART Suite Wiki
type: guide
status: draft
last_reviewed: 2026-10-17
---

# SMART Suite Wiki

Central documentation for the SMART product suite: what each product does, how products
interact, how they are laid out, what the current **standard** version is, and where
**client-specific variants** differ from it.

Lives in `/wiki` of the suite repo. Code paths are relative to the repo root.
Used by both humans and coding agents. Agents: read [AGENTS.md](AGENTS.md) first.

## Products

| Product | Purpose | Layout family | Standard | Docs |
|---|---|---|---|---|
| SMART Hub | Payables (AP) and Receivables (AR) | Portal | R1.0 | [products/smart-hub](products/smart-hub/overview.md) |
| SMART Enroll | Enrollment portal for Hub access | Enroll | R1 | [products/smart-enroll](products/smart-enroll/overview.md) |
| SMART Exchange | Supplier portal for receiving payments | Portal | R3 | [products/smart-exchange](products/smart-exchange/overview.md) |
| Consumer Portal | Consumer portal for receiving payments | Portal | TODO | [products/consumer-portal](products/consumer-portal/overview.md) |
| SMART Disburse | Token flow for disbursing payments | Token flow | R3 | [products/smart-disburse](products/smart-disburse/overview.md) |
| SMART Collect | Token flow for collecting payments | Token flow | R1 | [products/smart-collect](products/smart-collect/overview.md) |

## Where to start

| I want to… | Go to |
|---|---|
| Understand the suite at a glance | [suite/overview.md](suite/overview.md) |
| See how products connect | [suite/integrations.md](suite/integrations.md) |
| Understand the three layout families | [suite/layouts.md](suite/layouts.md) |
| Look up a term | [suite/glossary.md](suite/glossary.md) |
| Know what the current standard of a product is | `products/<product>/standard.md` |
| Know what a client has customized | [clients/](clients/README.md) and `products/<product>/variants/` |
| Learn the rules (versions, client codes, branches, file format) | [CONVENTIONS.md](CONVENTIONS.md) |
| Understand why something was decided | [decisions/](decisions/README.md) |
| Design system | [design-system/](design-system/README.md) (source of truth: Figma) |

## How this wiki is maintained

- Agents **propose** changes (pull requests); humans **review and approve**.
- Pages marked `status: draft` or containing `TODO` are unverified, so treat them as such.
