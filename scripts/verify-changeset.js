#!/usr/bin/env node

/**
 * Verify Changeset Presence
 *
 * Pre-push validation script that checks whether the current branch
 * has at least one changeset file (.changeset/*.md) in its commits
 * since diverging from main.
 *
 * Exit codes:
 *   0 - Changeset found or check skipped (push allowed)
 *   1 - No changeset found (push blocked)
 */

import { execSync } from 'child_process';

/**
 * Run a git command and return trimmed output, or null on failure
 */
function git(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Main function
 */
function main() {
  // Determine the current branch name
  // In CI (GitHub Actions), the branch name is passed via environment variable
  // because the checkout is a merge commit, not the actual branch
  const branch = process.env.CHANGESET_BRANCH || git('rev-parse --abbrev-ref HEAD');

  // Skip validation in cases where changesets are not required
  if (!branch || branch === 'HEAD') {
    // Detached HEAD (e.g., tag push) -- allow
    process.exit(0);
  }

  if (branch === 'main' || branch === 'master') {
    process.exit(0);
  }

  if (branch.startsWith('dependabot/')) {
    process.exit(0);
  }

  // Find the merge base with main
  const mergeBase = git('merge-base main HEAD') || git('merge-base master HEAD');

  if (!mergeBase) {
    // Could not determine merge base (e.g., shallow clone without full history)
    // Allow the push with a warning
    console.log('⚠ Warning: Could not determine merge base with main. Skipping changeset check.');
    process.exit(0);
  }

  // List all files changed since the merge base
  const diffOutput = git(`diff --name-only ${mergeBase}..HEAD`);
  const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

  // Check for changeset files (exclude README.md and .gitkeep)
  const changesetFiles = changedFiles.filter(
    (file) =>
      file.startsWith('.changeset/') && file.endsWith('.md') && file !== '.changeset/README.md'
  );

  if (changesetFiles.length > 0) {
    console.log(`✅ Found ${changesetFiles.length} changeset(s). Push allowed.`);
    process.exit(0);
  }

  // No changeset found -- block the push
  console.error(`
❌ ERROR: No changeset found for this branch.

Before pushing, please create a changeset by running:

  npm run changeset

This generates a .changeset/*.md file describing your changes.
Changesets help track what changed and why for each branch.

To skip this check (e.g., for CI branches), use:

  git push --no-verify
`);
  process.exit(1);
}

main();
