#!/usr/bin/env bash
# PostToolUse: lint only the frontend file that was just edited. The repo-wide lint has
# existing failures (issue #91), so this reports on one file instead of the whole tree.
f=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in
  */src/*.jsx|*/src/*.js)
    # Judge pass/fail by eslint's own exit code: filtering its output with grep -v would
    # exit 1 on a clean file (nothing left after the baseline notice) and look like a failure.
    cd "$CLAUDE_PROJECT_DIR" || exit 0
    if ! out=$(npx eslint "$f" 2>&1); then
      echo "$out" | grep -v baseline-browser-mapping >&2
      exit 2
    fi ;;
esac
exit 0
