#!/usr/bin/env node

/**
 * Release Tag Script
 *
 * Flow:
 * 1. Read and parse .changeset/*.md files
 * 2. Bump version via scripts/bump-version.js
 * 3. Build release notes from parsed changesets
 * 4. Delete parsed changeset files
 * 5. Create annotated git tag with release notes
 *
 * Usage:
 *   npm run release:patch
 *   npm run release:minor
 *   npm run release:major
 *   npm run release -- 1.2.3
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const changesetDir = path.join(rootDir, '.changeset');
const bumpScriptPath = path.join(rootDir, 'scripts', 'bump-version.js');
const packageJsonPath = path.join(rootDir, 'package.json');
const changelogMdPath = path.join(rootDir, 'CHANGELOG.md');
const changelogJsonPath = path.join(rootDir, 'CHANGELOG.json');

const TYPE_TITLES = {
  feat: 'Features',
  fix: 'Fixes',
  docs: 'Documentation',
  style: 'Style',
  refactor: 'Refactoring',
  perf: 'Performance',
  test: 'Tests',
  build: 'Build',
  ci: 'CI',
  chore: 'Chores',
  revert: 'Reverts',
  other: 'Other',
};

const TYPE_ORDER = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'style',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
  'other',
];

const CHANGELOG_SECTION_MAP = {
  feat: 'Added',
  fix: 'Fixed',
  docs: 'Documentation',
  test: 'Tests',
  style: 'Changed',
  refactor: 'Changed',
  perf: 'Changed',
  build: 'Technical',
  ci: 'Technical',
  chore: 'Technical',
  revert: 'Changed',
  other: 'Changed',
};

const CHANGELOG_SECTION_ORDER = [
  'Added',
  'Changed',
  'Fixed',
  'Technical',
  'Documentation',
  'Tests',
];
const CHANGELOG_JSON_SECTION_MAP = {
  feat: 'Added',
  fix: 'Fixed',
  docs: 'Documentation',
  style: 'Changed',
  refactor: 'Changed',
  perf: 'Changed',
  test: 'Technical',
  build: 'Technical',
  ci: 'Technical',
  chore: 'Technical',
  revert: 'Changed',
  other: 'Changed',
};
const CHANGELOG_JSON_SECTION_ORDER = [
  'Added',
  'Changed',
  'Fixed',
  'Security',
  'Technical',
  'Documentation',
];

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Expected: X.Y.Z`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(currentVersion, bumpType) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      parseVersion(bumpType);
      return bumpType;
  }
}

function runGit(command) {
  return execSync(`git ${command}`, { cwd: rootDir, encoding: 'utf8' }).trim();
}

function ensureGitRepo() {
  try {
    const output = runGit('rev-parse --is-inside-work-tree');
    if (output !== 'true') {
      throw new Error();
    }
  } catch {
    throw new Error('This script must be run inside a git repository.');
  }
}

function readCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function getChangesetFiles() {
  if (!fs.existsSync(changesetDir)) {
    return [];
  }

  return fs
    .readdirSync(changesetDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => path.join(changesetDir, file));
}

function parseChangeset(content, filePath) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fallbackDescription = content.trim().split('\n')[0] || path.basename(filePath);

  if (!frontmatterMatch) {
    return {
      type: 'other',
      description: fallbackDescription,
      branch: null,
      filePath,
    };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();
  const metadata = {};

  for (const line of frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    metadata[key] = value;
  }

  const rawType = (metadata.type || 'other').toLowerCase();
  const type = TYPE_TITLES[rawType] ? rawType : 'other';

  return {
    type,
    description: normalizeDescription(body || fallbackDescription),
    branch: metadata.branch || null,
    filePath,
  };
}

function normalizeDescription(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

function normalizeVersion(version) {
  return String(version || '')
    .replace(/^v/i, '')
    .trim();
}

function formatReleaseNotes(version, entries) {
  const grouped = new Map();

  for (const type of TYPE_ORDER) {
    grouped.set(type, []);
  }

  for (const entry of entries) {
    grouped.get(entry.type).push(entry);
  }

  const lines = [`v${version}`, '', `Release date: ${new Date().toISOString().split('T')[0]}`, ''];

  for (const type of TYPE_ORDER) {
    const typeEntries = grouped.get(type);
    if (!typeEntries || typeEntries.length === 0) {
      continue;
    }

    lines.push(`### ${TYPE_TITLES[type]}`);
    for (const entry of typeEntries) {
      const branchInfo = entry.branch ? ` (${entry.branch})` : '';
      lines.push(`- ${entry.description}${branchInfo}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatChangelogSections(entries) {
  const sections = new Map();
  for (const section of CHANGELOG_SECTION_ORDER) {
    sections.set(section, []);
  }

  for (const entry of entries) {
    const section = CHANGELOG_SECTION_MAP[entry.type] || 'Changed';
    sections.get(section).push(entry.description);
  }

  const lines = [];
  for (const section of CHANGELOG_SECTION_ORDER) {
    const sectionEntries = sections.get(section);
    if (!sectionEntries || sectionEntries.length === 0) {
      continue;
    }

    lines.push(`### ${section}`);
    for (const description of sectionEntries) {
      lines.push(`- ${description}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function updateChangelogMdForRelease(version, entries) {
  const content = fs.readFileSync(changelogMdPath, 'utf8');
  const headingRegex = new RegExp(`^## \\[${escapeRegExp(version)}\\] - .*?$`, 'm');
  const headingMatch = content.match(headingRegex);

  if (!headingMatch || headingMatch.index === undefined) {
    throw new Error(`Could not find CHANGELOG.md section for version ${version}.`);
  }

  const headingStart = headingMatch.index;
  const headingEnd = headingStart + headingMatch[0].length;
  const nextHeadingRelativeIndex = content.slice(headingEnd).search(/\n## \[/);
  const sectionEnd =
    nextHeadingRelativeIndex === -1 ? content.length : headingEnd + nextHeadingRelativeIndex + 1;

  const sectionsBody = formatChangelogSections(entries);
  const updatedSection = sectionsBody
    ? `${headingMatch[0]}\n\n${sectionsBody}\n`
    : `${headingMatch[0]}\n`;
  const updatedContent =
    content.slice(0, headingStart) + updatedSection + content.slice(sectionEnd);

  fs.writeFileSync(changelogMdPath, updatedContent, 'utf8');
  console.log(`✓ Updated ${path.basename(changelogMdPath)} with release notes for v${version}`);
}

function formatChangelogJsonSections(entries) {
  const sections = new Map();
  for (const section of CHANGELOG_JSON_SECTION_ORDER) {
    sections.set(section, []);
  }

  for (const entry of entries) {
    const section = CHANGELOG_JSON_SECTION_MAP[entry.type] || 'Changed';
    sections.get(section).push(entry.description);
  }

  const sectionObject = {};
  for (const section of CHANGELOG_JSON_SECTION_ORDER) {
    const sectionEntries = sections.get(section);
    if (!sectionEntries || sectionEntries.length === 0) {
      continue;
    }
    sectionObject[section] = sectionEntries;
  }

  return sectionObject;
}

function updateChangelogJsonForRelease(version, entries) {
  let changelog = { versions: [] };

  try {
    changelog = JSON.parse(fs.readFileSync(changelogJsonPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw new Error(`Failed to read CHANGELOG.json: ${error.message}`);
    }
  }

  if (!changelog || !Array.isArray(changelog.versions)) {
    throw new Error('CHANGELOG.json is not in the expected format.');
  }

  const today = new Date().toISOString().split('T')[0];
  const releaseEntry = {
    version,
    date: today,
    sections: formatChangelogJsonSections(entries),
  };

  const existingIndex = changelog.versions.findIndex(
    (entry) => normalizeVersion(entry.version) === normalizeVersion(version)
  );

  if (existingIndex === -1) {
    changelog.versions.unshift(releaseEntry);
  } else if (existingIndex === 0) {
    changelog.versions[0] = releaseEntry;
  } else {
    changelog.versions.splice(existingIndex, 1);
    changelog.versions.unshift(releaseEntry);
  }

  fs.writeFileSync(changelogJsonPath, JSON.stringify(changelog, null, 2) + '\n', 'utf8');
  console.log(`✓ Updated ${path.basename(changelogJsonPath)} with release notes for v${version}`);
}

function tagExists(tagName) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`], {
    cwd: rootDir,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function runVersionBump(bumpType) {
  const result = spawnSync('node', [bumpScriptPath, bumpType], { cwd: rootDir, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Version bump failed. Aborting release tag flow.');
  }
}

function deleteChangesetFiles(files) {
  for (const file of files) {
    fs.unlinkSync(file);
    const relativePath = path.relative(rootDir, file);
    console.log(`✓ Deleted ${relativePath}`);
  }
}

function createAnnotatedTag(tagName, releaseNotes) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabber-release-'));
  const notesPath = path.join(tempDir, 'release-notes.md');

  try {
    fs.writeFileSync(notesPath, releaseNotes, 'utf8');
    runGit(`tag -a --cleanup=verbatim ${tagName} -F "${notesPath}"`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function printUsage() {
  console.log('\nUsage:');
  console.log('  npm run release:patch    # Bump patch and create tag');
  console.log('  npm run release:minor    # Bump minor and create tag');
  console.log('  npm run release:major    # Bump major and create tag');
  console.log('  npm run release -- 1.2.3 # Set specific version and create tag\n');
}

function main() {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Error: No bump type/version specified.');
      printUsage();
      process.exit(1);
    }

    ensureGitRepo();

    const bumpType = args[0];
    const currentVersion = readCurrentVersion();
    const targetVersion = bumpVersion(currentVersion, bumpType);
    const tagName = `v${targetVersion}`;

    if (tagExists(tagName)) {
      throw new Error(`Tag ${tagName} already exists.`);
    }

    const changesetFiles = getChangesetFiles();
    if (changesetFiles.length === 0) {
      throw new Error('No changeset files found in .changeset/. Nothing to release.');
    }

    const entries = changesetFiles.map((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      return parseChangeset(content, filePath);
    });

    console.log(`\n🔄 Releasing ${currentVersion} → ${targetVersion}\n`);

    runVersionBump(bumpType);

    const finalVersion = readCurrentVersion();
    if (finalVersion !== targetVersion) {
      throw new Error(
        `Version mismatch after bump (expected ${targetVersion}, got ${finalVersion}).`
      );
    }

    updateChangelogMdForRelease(finalVersion, entries);
    updateChangelogJsonForRelease(finalVersion, entries);

    const releaseNotes = formatReleaseNotes(finalVersion, entries);
    createAnnotatedTag(`v${finalVersion}`, releaseNotes);
    deleteChangesetFiles(changesetFiles);

    console.log(`\n✅ Created tag v${finalVersion} with release notes from changesets.`);
    console.log('\nNext steps:');
    console.log('  1. Review: git status && git show v' + finalVersion);
    console.log(
      '  2. Commit version + changeset cleanup: git commit -am "chore: release v' +
        finalVersion +
        '"'
    );
    console.log('  3. Push commit and tag: git push && git push --tags\n');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
