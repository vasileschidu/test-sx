#!/bin/bash
# Report commits on origin/main that this branch doesn't have yet.
#   main-check.sh            → plain text for Claude (empty when nothing new)
#   main-check.sh --hook     → SessionStart JSON (additionalContext) when there is something
#   main-check.sh --new-only → only commits not reported before (state in .git/claude-main-seen)
cd "$(dirname "$0")/../.." || exit 0
git fetch -q origin main 2>/dev/null || exit 0
seen_file=".git/claude-main-seen"
range="HEAD..origin/main"
if [ "$1" = "--new-only" ] && [ -f "$seen_file" ]; then
  last=$(cat "$seen_file")
  git cat-file -e "$last" 2>/dev/null && range="$last..origin/main"
fi
list=$(git log --no-merges --format='%h %ad %an — %s' --date=short "$range" 2>/dev/null | head -15)
git rev-parse origin/main > "$seen_file" 2>/dev/null
[ -z "$list" ] && exit 0
n=$(printf '%s\n' "$list" | wc -l | tr -d ' ')
msg="New on origin/main (not in this branch): $n commit(s):
$list
Tell Andrian (in Romanian, short): who changed what; offer to merge main into andrian-sandbox and run sd-regression."
if [ "$1" = "--hook" ]; then
  python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":sys.argv[1]}}))' "$msg"
else
  printf '%s\n' "$msg"
fi
exit 0
