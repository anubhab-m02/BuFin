#!/usr/bin/env bash
# PostToolUse: after a migration file changes, make sure the chain still has a single head.
f=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in
  */backend/alembic/versions/*.py)
    python3 "$CLAUDE_PROJECT_DIR/backend/scripts/check_alembic_heads.py" >&2 || exit 2 ;;
esac
exit 0
