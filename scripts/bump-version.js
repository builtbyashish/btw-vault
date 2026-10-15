#!/usr/bin/env node

/**
 * Version bumper script for btw-vault.
 * Synchronizes version and versionCode across:
 *   1. package.json (version)
 *   2. app.json (expo.version & expo.android.versionCode)
 *   3. android/app/build.gradle (versionCode & versionName)
 *   4. app/about.tsx (UI badge)
 *   5. app/(tabs)/settings.tsx (UI footer)
 *
 * Usage:
 *   node scripts/bump-version.js [patch|minor|major|<specific-version>] [--dry-run]
 *   node scripts/bump-version.js current
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const APP_JSON_PATH = path.join(ROOT_DIR, 'app.json');
const BUILD_GRADLE_PATH = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
const ABOUT_SCREEN_PATH = path.join(ROOT_DIR, 'app', 'about.tsx');
const SETTINGS_SCREEN_PATH = path.join(ROOT_DIR, 'app', '(tabs)', 'settings.tsx');

function parseVersion(v) {
  const parts = v.trim().replace(/^v/, '').split('.').map((p) => parseInt(p, 10));
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

function calculateNextVersion(currentVersion, bumpType) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
        return bumpType;
      }
      return `${major}.${minor}.${patch + 1}`;
  }
}

function bumpVersion() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const cleanArgs = args.filter((a) => a !== '--dry-run');
  const bumpType = cleanArgs[0] || 'patch';

  // 1. Read package.json
  const pkgContent = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  const pkg = JSON.parse(pkgContent);
  const oldVersion = pkg.version;

  // 2. Read app.json
  const appContent = fs.readFileSync(APP_JSON_PATH, 'utf8');
  const app = JSON.parse(appContent);
  const oldCode = app.expo?.android?.versionCode || 1;

  if (bumpType === 'current' || bumpType === '--current') {
    console.log(`Current btw-vault version: v${oldVersion} (versionCode: ${oldCode})`);
    return;
  }

  const newVersion = calculateNextVersion(oldVersion, bumpType);
  const newCode = oldCode + 1;

  console.log(`\n========================================`);
  console.log(`Bumping btw-vault version${isDryRun ? ' [DRY RUN]' : ''}:`);
  console.log(`  Version:     ${oldVersion} -> ${newVersion}`);
  console.log(`  versionCode: ${oldCode} -> ${newCode}`);
  console.log(`========================================\n`);

  if (isDryRun) {
    console.log(`Dry run complete. No files were modified.`);
    return;
  }

  // Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`✔ Updated package.json`);

  // Update app.json
  app.expo.version = newVersion;
  if (app.expo.android) {
    app.expo.android.versionCode = newCode;
  }
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(app, null, 2) + '\n', 'utf8');
  console.log(`✔ Updated app.json`);

  // Update android/app/build.gradle
  if (fs.existsSync(BUILD_GRADLE_PATH)) {
    let gradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
    gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newCode}`);
    gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${newVersion}"`);
    fs.writeFileSync(BUILD_GRADLE_PATH, gradle, 'utf8');
    console.log(`✔ Updated android/app/build.gradle`);
  }

  // Update app/about.tsx
  if (fs.existsSync(ABOUT_SCREEN_PATH)) {
    let about = fs.readFileSync(ABOUT_SCREEN_PATH, 'utf8');
    about = about.replace(/v\d+\.\d+\.\d+ • Offline-First/, `v${newVersion} • Offline-First`);
    fs.writeFileSync(ABOUT_SCREEN_PATH, about, 'utf8');
    console.log(`✔ Updated app/about.tsx`);
  }

  // Update app/(tabs)/settings.tsx
  if (fs.existsSync(SETTINGS_SCREEN_PATH)) {
    let settings = fs.readFileSync(SETTINGS_SCREEN_PATH, 'utf8');
    settings = settings.replace(/btw vault v\d+\.\d+\.\d+/, `btw vault v${newVersion}`);
    fs.writeFileSync(SETTINGS_SCREEN_PATH, settings, 'utf8');
    console.log(`✔ Updated app/(tabs)/settings.tsx`);
  }

  console.log(`\nDone! Successfully bumped version to v${newVersion} (${newCode}).`);
}

bumpVersion();
