# Antigravity Project Rules: btw-vault

## Mandatory Version Bump Before Git Push
Before executing any `git push` command (to `develop`, `main`, or any release branch) that introduces new commits or changes:
1. **Always Bump App Version & Build Code**:
   - Run: `npm run bump-version` (defaults to patch, e.g. `1.3.0` -> `1.3.1`, incrementing `versionCode`).
   - If introducing significant new features, pass `minor` (`npm run bump-version minor`).
   - If introducing breaking architecture changes, pass `major` (`npm run bump-version major`).
2. **Synchronized Files**:
   `scripts/bump-version.js` automatically maintains consistency across:
   - `package.json` (`version`)
   - `app.json` (`expo.version`, `expo.android.versionCode`)
   - `android/app/build.gradle` (`versionCode`, `versionName`)
   - `app/about.tsx` (version badge)
   - `app/(tabs)/settings.tsx` (version footer)
3. **Commit the Bump**:
   Stage all modified files and commit with:
   `chore: bump version to v<new_version> (build <new_versionCode>)`
4. **Verification**:
   Run `npm test` and `npx tsc --noEmit` to confirm 0 errors before pushing.
5. **Push**:
   Only after the version is bumped and committed, push to origin.
