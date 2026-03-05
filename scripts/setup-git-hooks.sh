#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$REPO_ROOT"

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit

echo "Configured core.hooksPath to .githooks"
echo "The pre-commit hook now runs helper.py and stages index.html"
