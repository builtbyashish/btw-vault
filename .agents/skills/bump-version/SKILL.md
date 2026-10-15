---
name: bump-version
description: Automated version and Android versionCode bump workflow for btw-vault before pushing commits to git or publishing releases. Use whenever the user asks to bump version, prepare a release, or push changes.
---

# Version Bump Workflow for btw-vault

This skill defines the canonical procedure to bump the application version and Android `versionCode` consistently across the codebase prior to pushing to git.

## Files Maintained
Every version bump must synchronize the following 5 files:
1. `package.json`: `"version": "X.Y.Z"`
2. `app.json`: `"expo.version": "X.Y.Z"` and `"expo.android.versionCode": N`
3. `android/app/build.gradle`: `versionCode N` and `versionName "X.Y.Z"`
4. `app/about.tsx`: `<Text style={styles.versionBadgeText}>vX.Y.Z • Offline-First • SQLCipher AES-256</Text>`
5. `app/(tabs)/settings.tsx`: `<Text style={styles.footerText}>btw vault vX.Y.Z • Tap for architecture & about</Text>`

## Execution Steps

### 1. Check Current Version
```bash
npm run bump-version current
```

### 2. Perform the Bump
Choose the appropriate semantic version increment:
- **Patch (Bug fixes, internal improvements)**:
  ```bash
  npm run bump-version
  # or: npm run bump-version patch
  ```
- **Minor (New user-facing features, screens, settings)**:
  ```bash
  npm run bump-version minor
  ```
- **Major (Breaking architecture migrations)**:
  ```bash
  npm run bump-version major
  ```
- **Specific Version**:
  ```bash
  npm run bump-version 1.4.0
  ```

### 3. Verify Integrity
Always verify type safety and tests pass with the bumped version:
```bash
npx tsc --noEmit
npm test
```

### 4. Stage, Commit & Push
```bash
git add package.json app.json android/app/build.gradle app/about.tsx app/\(tabs\)/settings.tsx
git commit -m "chore: bump version to v<new_version> (build <new_versionCode>)"
git push origin <branch>
```
