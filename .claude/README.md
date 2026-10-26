# Claude Code setup for SMART Disburse

These agents are **only for SMART Disburse** (onboarding pages and the Figma Multi-Party Flow page). Other SMART products use the suite agents (`proto-engineer`, `figma-designer`, `ui-qa-code`, `ui-qa-figma`). On SD, `sd-design-rules` overrides the suite skills `components` and `design-system`.

Four agents share one rule set. Ask Claude Code in plain words ("ask the sd-qa agent to compare
Welcome with Figma", "have the sd-figma agent draw the 7.1 arrows"), or call them by name.

| Agent | Writes to | Job |
|---|---|---|
| `sd-figma` | Figma only | Screens, tablet/mobile/desktop frames, section layout, flow arrows on the Multi-Party Flow page |
| `sd-sandbox` | Repo code only | Onboarding pages and scripts, matched to Figma at 375 / 768 / 1280 |
| `sd-qa` | Nothing (read-only) | Discrepancies between sandbox, Figma and the flow in code, with numbers and severity |
| `sd-flow-mapper` | Nothing (read-only) | Map of every control in code → what it does → target, matched to Figma frames and existing arrows |

Typical loops:
- Fixing differences: **sd-qa** finds discrepancies → you decide → **sd-figma** or **sd-sandbox** fixes → **sd-qa** re-checks.
- New arrows or screens: **sd-flow-mapper** maps the flow → you confirm which branches to show → **sd-figma** draws → **sd-qa** checks.

## Where things live

| Path | What |
|---|---|
| `skills/sd-design-rules/` | **The shared rules:** sources of truth, breakpoints, sizes, layout, working rules, report format. Change rules here, once. |
| `skills/figma-sd-techniques/` | How-to for Figma: attached elbow arrows (clone model), overlap audit, tablet frames, re-layout |
| `skills/sandbox-render/` | No-cache server and `render.mjs` (exact-viewport screenshots, clicks, measurements) |
| `agents/*.md` | Each agent's role and boundaries |

Repo-wide rules still apply: `PROJECT_RULES.md` and `wiki/AGENTS.md`.

## Guardrails built in

- Every agent reads the current state first, because people edit the same Figma page and repo in parallel.
- One section per run, with evidence (audit, measurements, screenshots) before "done".
- No commit, push or merge without an explicit OK.
- Two agents never write to the same Figma page at once.
- New lessons go into the skill files, so the next run starts smarter.

`sd-qa` uses the claude.ai Figma connector tool names (`mcp__claude_ai_Figma__*`). If you use a different
Figma MCP server, adjust the `tools:` line in `agents/sd-qa.md`.
