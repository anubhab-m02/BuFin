#!/usr/bin/env bash
# PostToolUse: lint only the frontend file that was just edited. The repo-wide lint has
# existing failures (issue #91), so this reports on one file instead of the whole tree.
f=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in
  */src/*.jsx|*/src/*.js)
    cd "$CLAUDE_PROJECT_DIR" && out=$(npx eslint "$f" 2>&1 | grep -v baseline-browser-mapping) || { echo "$out" >&2; exit 2; } ;;
esac
exit 0
