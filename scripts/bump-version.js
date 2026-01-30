#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Updates version across all project files:
 * - package.json
 * - manifest.json
 * - CHANGELOG.json
 * - CHANGELOG.md
 * - settings/settings.html
 *
 * Usage:
 *   npm run version:patch  # 1.0.0 -> 1.0.1
 *   npm run version:minor  # 1.0.0 -> 1.1.0
 *   npm run version:major  # 1.0.0 -> 2.0.0
 *   npm run version -- 1.2.3  # Set specific version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Files that contain version references
const FILES_TO_UPDATE = {
  packageJson: path.join(rootDir, 'package.json'),
  manifestJson: path.join(rootDir, 'manifest.json'),
  changelogJson: path.join(rootDir, 'CHANGELOG.json'),
  changelogMd: path.join(rootDir, 'CHANGELOG.md'),
  settingsHtml: path.join(rootDir, 'settings', 'settings.html'),
};

/**
 * Parse a semantic version string
 */
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

/**
 * Bump version based on type
 */
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
      // Validate if it's a specific version
      parseVersion(bumpType); // Will throw if invalid
      return bumpType;
  }
}

/**
 * Update package.json
 */
function updatePackageJson(newVersion) {
  const filePath = FILES_TO_UPDATE.packageJson;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const oldVersion = content.version;
  content.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`✓ Updated ${path.basename(filePath)}: ${oldVersion} → ${newVersion}`);
  return oldVersion;
}

/**
 * Update manifest.json
 */
function updateManifestJson(oldVersion, newVersion) {
  const filePath = FILES_TO_UPDATE.manifestJson;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(`"version": "${oldVersion}"`, `"version": "${newVersion}"`);
  fs.writeFileSync(filePath, content);
  console.log(`✓ Updated ${path.basename(filePath)}: ${oldVersion} → ${newVersion}`);
}

/**
 * Update CHANGELOG.json - only the most recent version entry
 */
function updateChangelogJson(oldVersion, newVersion) {
  const filePath = FILES_TO_UPDATE.changelogJson;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (content.versions && content.versions.length > 0) {
    const latestEntry = content.versions[0];
    if (latestEntry.version === oldVersion) {
      latestEntry.version = newVersion;
      latestEntry.date = new Date().toISOString().split('T')[0]; // Update date to today
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
      console.log(`✓ Updated ${path.basename(filePath)}: ${oldVersion} → ${newVersion}`);
    } else {
      console.log(
        `⚠ Warning: Latest CHANGELOG.json entry (${latestEntry.version}) doesn't match current version (${oldVersion})`
      );
      console.log(`  Skipping CHANGELOG.json update. You may need to add a new entry manually.`);
    }
  }
}

/**
 * Update CHANGELOG.md - add new version section under [Unreleased]
 */
function updateChangelogMd(oldVersion, newVersion) {
  const filePath = FILES_TO_UPDATE.changelogMd;
  let content = fs.readFileSync(filePath, 'utf8');

  const today = new Date().toISOString().split('T')[0];
  const newVersionSection = `## [${newVersion}] - ${today}

### Added
- Version bump from ${oldVersion} to ${newVersion}

### Changed

### Fixed

### Security

### Technical

`;

  // Insert the new version section after the [Unreleased] section
  const unreleasedIndex = content.indexOf('## [Unreleased]');
  if (unreleasedIndex !== -1) {
    // Find the end of the [Unreleased] section (next ## section or end of content)
    const nextSectionMatch = content.slice(unreleasedIndex + 15).match(/\n## \[/);
    const insertIndex = nextSectionMatch
      ? unreleasedIndex + 15 + nextSectionMatch.index + 1
      : content.length;

    content = content.slice(0, insertIndex) + '\n' + newVersionSection + content.slice(insertIndex);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${path.basename(filePath)}: Added v${newVersion} section`);
  } else {
    console.log(`⚠ Warning: Could not find [Unreleased] section in ${path.basename(filePath)}`);
    console.log(`  Please manually add the v${newVersion} section to CHANGELOG.md`);
  }
}

/**
 * Update settings.html
 */
function updateSettingsHtml(oldVersion, newVersion) {
  const filePath = FILES_TO_UPDATE.settingsHtml;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(`AI Tab Grouper v${oldVersion}`, `AI Tab Grouper v${newVersion}`);
  fs.writeFileSync(filePath, content);
  console.log(`✓ Updated ${path.basename(filePath)}: v${oldVersion} → v${newVersion}`);
}

/**
 * Main function
 */
function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.error('Error: No version bump type specified');
      console.log('\nUsage:');
      console.log('  npm run version:patch    # Bump patch version (1.0.0 -> 1.0.1)');
      console.log('  npm run version:minor    # Bump minor version (1.0.0 -> 1.1.0)');
      console.log('  npm run version:major    # Bump major version (1.0.0 -> 2.0.0)');
      console.log('  npm run version -- 1.2.3 # Set specific version');
      process.exit(1);
    }

    const bumpType = args[0];

    // Read current version from package.json
    const packageJson = JSON.parse(fs.readFileSync(FILES_TO_UPDATE.packageJson, 'utf8'));
    const currentVersion = packageJson.version;

    // Calculate new version
    const newVersion = bumpVersion(currentVersion, bumpType);

    console.log(`\n🔄 Bumping version: ${currentVersion} → ${newVersion}\n`);

    // Update all files
    const oldVersion = updatePackageJson(newVersion);
    updateManifestJson(oldVersion, newVersion);
    updateChangelogJson(oldVersion, newVersion);
    updateChangelogMd(oldVersion, newVersion);
    updateSettingsHtml(oldVersion, newVersion);

    console.log(`\n✅ Version successfully updated to ${newVersion}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review the changes with: git diff`);
    console.log(`  2. Edit CHANGELOG.md to add specific changes for v${newVersion}`);
    console.log(`  3. Commit the changes: git commit -am "Bump version to ${newVersion}"`);
    console.log(`  4. Tag the release: git tag v${newVersion}`);
    console.log(`  5. Push: git push && git push --tags\n`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
