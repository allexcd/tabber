# Release Process

This project uses changesets + release scripts to automate version bumps, changelogs, and git tags.

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
