# Changesets

This directory contains changeset files that document changes made on feature branches.

## How to create a changeset

Run the following command from the project root:

```sh
npm run changeset
```

This will prompt you for:

1. The type of change (feat, fix, docs, etc.)
2. A description of the change

The script generates a `.md` file in this directory, stages it, and commits it.

## When to create a changeset

Create a changeset on every feature branch before pushing. The pre-push hook
will block pushes that don't have at least one changeset file.

## File format

Changeset files use YAML frontmatter with a Markdown body:

```yaml
---
type: feat
date: 2026-02-05T15:30:00.000Z
branch: feat/my-feature
---

Description of the change
```

## Skipping the check

For exceptional cases (CI branches, hotfixes), use `git push --no-verify`.
