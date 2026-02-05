#!/usr/bin/env node

/**
 * Changeset Generator
 *
 * Interactive CLI to create changeset files for feature branches.
 * Each changeset documents the type and description of a change.
 *
 * Usage:
 *   npm run changeset
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const changesetDir = path.join(rootDir, '.changeset');

const CHANGE_TYPES = [
  { value: 'feat', description: 'A new feature' },
  { value: 'fix', description: 'A bug fix' },
  { value: 'docs', description: 'Documentation only' },
  { value: 'style', description: 'Code style (formatting, semicolons, etc.)' },
  { value: 'refactor', description: 'Code refactoring' },
  { value: 'perf', description: 'Performance improvement' },
  { value: 'test', description: 'Adding or updating tests' },
  { value: 'build', description: 'Build system changes' },
  { value: 'ci', description: 'CI configuration changes' },
  { value: 'chore', description: 'Other changes (maintenance, deps, etc.)' },
  { value: 'revert', description: 'Revert a previous commit' },
];

/**
 * Create a URL-safe slug from a string
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Get the current git branch name
 */
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Prompt the user with a question and return their answer
 */
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Main function
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const branch = getCurrentBranch();

    if (!branch) {
      console.error('\n❌ Error: Could not detect the current git branch.\n');
      process.exit(1);
    }

    if (branch === 'main' || branch === 'master') {
      console.error('\n❌ Error: Changesets should be created on feature branches, not on main.\n');
      process.exit(1);
    }

    console.log('\nTabber Changeset Generator');
    console.log('=========================\n');
    console.log(`Current branch: ${branch}\n`);

    // Display change types
    console.log('Select change type:\n');
    CHANGE_TYPES.forEach((type, index) => {
      const num = String(index + 1).padStart(2, ' ');
      console.log(`  ${num}. ${type.value.padEnd(10)} - ${type.description}`);
    });

    // Prompt for change type
    let selectedType = null;
    while (!selectedType) {
      const typeInput = await ask(rl, `\nEnter number (1-${CHANGE_TYPES.length}): `);
      const typeIndex = parseInt(typeInput, 10) - 1;

      if (typeIndex >= 0 && typeIndex < CHANGE_TYPES.length) {
        selectedType = CHANGE_TYPES[typeIndex];
      } else {
        console.log(`⚠ Please enter a number between 1 and ${CHANGE_TYPES.length}.`);
      }
    }

    // Prompt for description
    let description = '';
    while (!description) {
      description = await ask(rl, '\nDescribe the change:\n> ');
      if (!description) {
        console.log('⚠ Description cannot be empty.');
      }
    }

    rl.close();

    // Generate filename
    const timestamp = Date.now();
    const slug = slugify(description);
    const filename = `${timestamp}-${slug}.md`;
    const filePath = path.join(changesetDir, filename);

    // Ensure .changeset directory exists
    if (!fs.existsSync(changesetDir)) {
      fs.mkdirSync(changesetDir, { recursive: true });
    }

    // Generate changeset file content
    const date = new Date().toISOString();
    const content = `---\ntype: ${selectedType.value}\ndate: ${date}\nbranch: ${branch}\n---\n\n${description}\n`;

    // Write the changeset file
    fs.writeFileSync(filePath, content);
    console.log(`\n✅ Created changeset: .changeset/${filename}`);

    // Stage and commit
    try {
      execSync(`git add "${filePath}"`, { cwd: rootDir, stdio: 'pipe' });
      const commitMessage = `chore: Add changeset for ${selectedType.value}`;
      execSync(`git commit -m "${commitMessage}"`, { cwd: rootDir, stdio: 'pipe' });
      console.log(`✅ Staged and committed to branch ${branch}.`);
    } catch {
      console.log(`\n⚠ Could not auto-commit the changeset.`);
      console.log(`  The file has been created at: .changeset/${filename}`);
      console.log(`  Please stage and commit it manually:\n`);
      console.log(`    git add .changeset/${filename}`);
      console.log(`    git commit -m "chore: Add changeset for ${selectedType.value}"\n`);
    }

    console.log(`\nYou can now push your branch with: git push\n`);
  } catch (error) {
    rl.close();
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
