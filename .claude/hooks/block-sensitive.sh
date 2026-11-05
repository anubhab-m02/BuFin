#!/usr/bin/env bash
# PreToolUse: refuse edits to secrets and local databases. Reads the tool call JSON on stdin.
f=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in
  *.env.example) exit 0 ;;
  *.env|*.env.*|*/.env|*.db|*.db.backup-*|*/bufin.db*)
    echo "Blocked: $f is a secret or local database file. Edit the example or ask the user." >&2
    exit 2 ;;
esac
exit 0
