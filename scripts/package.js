import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
const version = packageJson.version;
const ZIP_NAME = `tabber-release-v${version}.zip`;

const INCLUDE = [
  'manifest.json',
  'background.js',
  'popup',
  'settings',
  'services',
  'icons',
  'LICENSE',
  'README.md',
  'PRIVACY.md',
  'CHANGELOG.md',
  'CHANGELOG.json',
];

// Clean and recreate dist/
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true });
}
mkdirSync(DIST);

// Copy extension files
for (const entry of INCLUDE) {
  const src = resolve(ROOT, entry);
  if (!existsSync(src)) {
    console.warn(`  Skipping ${entry} (not found)`);
    continue;
  }

  const dest = resolve(DIST, entry);
  const isDir = statSync(src).isDirectory();
  cpSync(src, dest, { recursive: isDir });
  console.log(`  Copied ${entry}`);
}

// Remove existing zip if present
const zipPath = resolve(ROOT, ZIP_NAME);
if (existsSync(zipPath)) {
  rmSync(zipPath);
}

// Create zip from dist/
execSync(`cd "${DIST}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });

// Report size
const zipSize = statSync(zipPath).size;
const sizeKB = (zipSize / 1024).toFixed(1);
console.log(`\nPackaged ${ZIP_NAME} (${sizeKB} KB)`);
