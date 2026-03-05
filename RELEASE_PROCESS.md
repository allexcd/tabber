# Release Process

This project uses changesets + release scripts to automate version bumps, changelogs, and git tags.

## Conventional Commit Types

This project follows [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, branch names, changesets, and PR titles. Each change is categorized by type:

### Type Definitions

| Type         | When to Use                             | Examples                                 | Triggers Release |
| ------------ | --------------------------------------- | ---------------------------------------- | ---------------- |
| **feat**     | New features or functionality           | Add GPT-5 support, Implement dark mode   | ✅ Minor (x.1.0) |
| **fix**      | Bug fixes and corrections               | Fix race condition, Resolve memory leak  | ✅ Patch (x.x.1) |
| **docs**     | Documentation-only changes              | Update README, Add API docs              | ❌ No release    |
| **style**    | Code style/formatting (no logic change) | Fix indentation, Remove whitespace       | ❌ No release    |
| **refactor** | Code restructuring (no behavior change) | Extract function, Rename variable        | ❌ No release    |
| **perf**     | Performance improvements                | Optimize algorithm, Add caching          | ✅ Patch (x.x.1) |
| **test**     | Adding or fixing tests                  | Add unit tests, Fix flaky test           | ❌ No release    |
| **build**    | Build system or dependency changes      | Update webpack config, Bump dependencies | ❌ No release    |
| **ci**       | CI/CD configuration changes             | Update GitHub Actions, Add CodeQL        | ❌ No release    |
| **chore**    | Other maintenance tasks                 | Update .gitignore, Clean up logs         | ❌ No release    |

### Usage Examples

**Branch Names:**

```bash
git checkout -b feat/add-gpt5-support
git checkout -b fix/tab-grouping-race-condition
git checkout -b docs/update-privacy-policy
git checkout -b refactor/extract-ai-service
```

**Commit Messages:**

```bash
git commit -m "feat: Add GPT-5 model support"
git commit -m "fix: Resolve tab grouping race condition"
git commit -m "docs: Update installation instructions"
git commit -m "refactor: Extract AI service interface"
```

**Changesets:**
When running `npm run changeset`, select the type that matches your change:

- Choose `feat` → Creates a **minor** version bump (1.1.0 → 1.2.0)
- Choose `fix` or `perf` → Creates a **patch** version bump (1.1.0 → 1.1.1)
- Choose `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` → No version bump

**PR Titles:**

```
feat: Add support for GPT-5 models
fix: Resolve memory leak in tab processing
docs: Add privacy policy documentation
```

### Breaking Changes

For changes that break backward compatibility, add a `!` after the type:

```bash
git commit -m "feat!: Remove deprecated API endpoints"
npm run changeset  # Select "major" when prompted
```

This triggers a **major** version bump (1.x.x → 2.0.0).

## What The Release Script Does

`npm run release:*` will:

- Bump extension version
- Update `package.json` and `manifest.json`
- Update `CHANGELOG.md` from changeset entries
- Update `CHANGELOG.json` from changeset entries
- Create an annotated git tag `vX.Y.Z`
- Delete consumed `.changeset/*.md` files

It does **not** create a GitHub Release automatically.

## 1. Feature Branch Requirement (Before Merge)

Run this on each feature branch before pushing:

```bash
npm run changeset
git push
```

## 2. Start Release From `main`

```bash
git checkout main
git pull --ff-only
npm ci
```

## 3. Pre-Release Validation

Check clean working tree and pending changesets:

```bash
git status --porcelain
ls .changeset/*.md
```

Run quality checks:

```bash
npm run check
```

## 4. Run Release Command

Choose one:

```bash
npm run release:patch
# or
npm run release:minor
# or
npm run release:major
# or explicit version
npm run release -- 1.2.3
```

## 5. Verify Result

```bash
VERSION=$(node -p "require('./package.json').version")
git status
git show "v$VERSION" --no-patch
```

## 6. Commit Release Artifacts

```bash
git add -A
git commit -m "chore: release v$VERSION"
```

## 7. Push Commit And Tag

```bash
git push origin main
git push origin "v$VERSION"
```

## 8. Build Extension Zip (Optional)

```bash
npm run package
```

Expected artifact:

- `tabber-release-v$VERSION.zip`

## 9. Create GitHub Release (Optional, Manual)

With packaged zip attached:

```bash
gh release create "v$VERSION" "tabber-release-v$VERSION.zip" --notes-from-tag
```

Without asset:

```bash
gh release create "v$VERSION" --notes-from-tag
```
