#!/bin/bash
# PreCompact hook: append a factual snapshot (branch, changed files, recent commits) to today's
# hand-off note before the conversation is compacted, so the next context can pick up from it.
# The narrative part (decisions, open items) is written by the `handoff` skill.
cd "$(dirname "$0")/../.." || exit 0
day=$(date +%Y-%m-%d)
file=".claude/handoff/$day.md"
mkdir -p .claude/handoff
[ -f "$file" ] || printf '# Hand-off %s\n' "$day" > "$file"
{
  printf '\n## Auto snapshot %s (before compaction)\n\n' "$(date +%H:%M)"
  printf -- '- Branch: `%s`\n' "$(git branch --show-current)"
  printf -- '- Unpushed commits: %s\n' "$(git log --oneline @{u}..HEAD 2>/dev/null | wc -l | tr -d ' ')"
  printf -- '- Uncommitted files (%s):\n\n```\n' "$(git status --porcelain | wc -l | tr -d ' ')"
  git status --short | head -60
  printf '```\n\nLast commits:\n\n```\n'
  git log --oneline -5
  printf '```\n'
} >> "$file"
exit 0
