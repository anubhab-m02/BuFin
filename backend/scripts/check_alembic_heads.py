"""Fail if the Alembic migration chain has more than one head or a revision collision.

Pure standard library so it runs in CI and in a hook without installing dependencies.
Usage: python3 backend/scripts/check_alembic_heads.py
"""
import os
import re
import sys

VERSIONS = os.path.join(os.path.dirname(__file__), "..", "alembic", "versions")
REV = re.compile(r"^revision(?::[^=]+)?\s*=\s*['\"]([^'\"]+)['\"]", re.M)
DOWN = re.compile(r"^down_revision(?::[^=]+)?\s*=\s*(?:['\"]([^'\"]+)['\"]|None)", re.M)


def main() -> int:
    revisions, children = {}, {}
    for name in sorted(os.listdir(VERSIONS)):
        if not name.endswith(".py"):
            continue
        text = open(os.path.join(VERSIONS, name)).read()
        rev, down = REV.search(text), DOWN.search(text)
        if not rev:
            continue
        revisions[rev.group(1)] = name
        parent = down.group(1) if down else None
        children.setdefault(parent, []).append(name)

    problems = []
    for parent, files in children.items():
        if parent is not None and len(files) > 1:
            problems.append(f"revision collision: {', '.join(files)} all have down_revision {parent}")
    heads = [r for r in revisions if r not in children]
    if len(heads) != 1:
        problems.append(f"expected 1 head, found {len(heads)}: {', '.join(heads) or 'none'}")

    if problems:
        print("Alembic chain problem:\n  " + "\n  ".join(problems), file=sys.stderr)
        return 1
    print(f"Alembic chain ok: head {heads[0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
