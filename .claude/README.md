# Claude Code setup for SMART Disburse

Three agents share one rule set. Ask Claude Code in plain words ("ask the qa agent to compare
Welcome with Figma", "have the figma agent draw the 7.1 arrows"), or call them by name.

| Agent | Writes to | Job |
|---|---|---|
| `figma` | Figma only | Screens, tablet/mobile/desktop frames, section layout, flow arrows on the Multi-Party Flow page |
| `sandbox` | Repo code only | Onboarding pages and scripts, matched to Figma at 375 / 768 / 1280 |
| `qa` | Nothing (read-only) | Discrepancies between sandbox, Figma and the flow in code, with numbers and severity |

Typical loop: **qa** finds discrepancies → you decide → **figma** or **sandbox** fixes → **qa** re-checks.

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

`qa` uses the claude.ai Figma connector tool names (`mcp__claude_ai_Figma__*`). If you use a different
Figma MCP server, adjust the `tools:` line in `agents/qa.md`.
