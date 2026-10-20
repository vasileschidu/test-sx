---
title: Clients
type: guide
status: draft
last_reviewed: 2026-10-17
---

# Clients

One page per client, named by code (`c001.md`). Template: [templates/client.md](../templates/client.md).
**No real names.** See [AGENTS.md](../AGENTS.md#4-confidentiality).

## Variant matrix

Which standard version each client's variant is based on. `—` = product not used.
Compare with the latest standard to see how far behind each client is.

| Client | Branch | smart-hub | smart-enroll | smart-exchange | consumer-portal | smart-disburse | smart-collect |
|---|---|---|---|---|---|---|---|
| **Latest standard** | `main` | R1.0 | R1 | R3 | TODO | R3 | R1 |
| [c000](c000.md) (example) | `client/c000` | R1.0 | — | R3 ✱ | — | R3 | — |

✱ = has customizations (variant file exists). No mark = uses standard as-is at that release.
