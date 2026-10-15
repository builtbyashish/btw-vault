# Google Play Store: App Access & Review Instructions

When publishing to Google Play, the Play Store review team requires instructions on how to test all parts of the application under **Policy and programs** → **App content** → **App access**.

---

## 1. Play Console Selection

Under **App access**:
Select: **All functionality is available without special access restrictions**

*(Alternatively, if Google requires review credentials, select "All or some functionality in my app is restricted" and provide the sample credentials below).*

---

## 2. Reviewer Instructions (Copy & Paste to Google Reviewer Notes)

```text
btw vault is an offline-first, client-side encrypted password manager. It does not require creating an online account or connecting to a remote server.

To test all features of the application:

1. FIRST LAUNCH (VAULT SETUP):
   - On initial launch, the app prompts you to create a Master Password.
   - Enter any sample password with at least 8 characters (e.g. "TestVault123!").
   - You may toggle "Enable Biometric Unlock" or skip it.
   - Tap "Create Secure Vault". The encrypted SQLCipher database is initialized locally on the device.

2. ADDING AND VIEWING ITEMS:
   - Tap the "+" button or category chips to create Login credentials, Payment Cards, Secure Notes, or Custom Categories.
   - Tap any created item to view or edit details, copy credentials to clipboard, or generate random secure passwords.

3. SETTINGS & AUTO-LOCK:
   - Open the "Settings" tab to test Auto-Lock timeout preferences, Biometric toggle, and Anti-Capture screen protection.
   - Tap "Lock Vault Now" to lock the vault. Enter the master password created in Step 1 to unlock.

4. LOCAL BACKUP EXPORT / RESTORE:
   - In Settings, tap "Export Backup" to generate an AES-256 encrypted .btw-vault snapshot directly to the device Documents folder.
   - Tap "Wipe Vault" under Danger Zone to test full local data deletion.
   - On the setup screen, tap "Restore .btw-vault Backup" to restore the snapshot using the master password.

5. OPTIONAL GOOGLE DRIVE CLOUD BACKUP:
   - In Settings under "Google Drive Backup", tapping "Link Account & Back Up" uses standard Google OAuth 2.0 to back up the encrypted snapshot container to the user's personal Google Drive appdata folder.

No corporate login, subscription, or pre-configured credentials are required to review this app.
```
