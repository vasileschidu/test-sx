---
name: autosave
description: Start the periodic context save for this session — runs the `handoff` skill every 30 minutes (same as `/loop 30m /handoff`) without creating a duplicate job. Use at the start of a session, or when Andrian says "autosave", "pornește salvarea", "/loop 30m /handoff".
---
# Autosave (hand-off every 30 min)

1. Load `CronList` (ToolSearch `select:CronList,CronCreate`) and look for a job whose prompt is `/handoff`.
   - Found → don't create another; reply "Autosave already on (job <id>, next <time>)."
2. Not found → `CronCreate` with `cron: "7,37 * * * *"`, `prompt: "/handoff"`, `recurring: true`
   (off the :00/:30 marks on purpose).
3. Run the `handoff` skill once now so the note is current.
4. One line back: "Autosave on: /handoff every 30 min (job <id>, next <time>); session-only, expires after 7 days."

Notes
- Cron jobs live only in this session; the PreCompact / SessionStart hooks in `.claude/settings.local.json` persist.
- To stop: `CronDelete` with the job id.
