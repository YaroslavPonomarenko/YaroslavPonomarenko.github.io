# Git Hook Setup

Use `pre-commit` (not `pre-push`) so the timestamp update is included in the commit that you push.

## One-time setup per clone

Run:

```sh
./scripts/setup-git-hooks.sh
```

This sets `core.hooksPath` to `.githooks` for the current clone.

## What runs on each commit

- `.githooks/pre-commit`
- Runs `helper.py`
- Stages `index.html` automatically (`git add index.html`)

If you clone this repository again, run the setup command once in that clone.
