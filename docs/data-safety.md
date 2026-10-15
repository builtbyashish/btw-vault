# Google Play Console Data Safety Declaration for btw vault

Use this exact information when filling out the **Data safety** questionnaire in the Google Play Console under **Policy and programs** → **App content** → **Data safety**.

---

## Section 1: Data Collection & Sharing Overview

| Question in Play Console | Answer | Reason / Explanation |
| :--- | :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **No** | btw vault is completely offline-first. Credentials, notes, and cards are stored locally in an encrypted SQLCipher database on the user's device and never collected by the developer. |
| **Is all of the user data collected by your app encrypted in transit?** | **Yes** | If the user enables optional Google Drive backup, the encrypted vault container is transmitted strictly via HTTPS/TLS to Google Drive. |
| **Do you provide a way for users to request that their data be deleted?** | **Yes** | The user can wipe the entire database, cryptographic keys, and settings with one tap via "Wipe Vault" in the Settings screen. |

---

## Section 2: Detailed Data Types Breakdown

Select **No** for all standard data categories:

- **Location**: No (not collected)
- **Personal info** (Name, Email, User IDs, Address, Phone number): **No**  
  *(Note: If Google Drive is linked, Google Sign-in authenticates the user directly via standard OAuth to access their personal drive; no personal info is transmitted to or collected by our servers).*
- **Financial info** (Credit cards, bank account info): **No**  
  *(Note: Cards stored by the user inside the vault are encrypted client-side and never collected or processed).*
- **Health and fitness**: No
- **Messages**: No
- **Photos and videos**: No
- **Audio files**: No
- **Files and docs**: No
- **Calendar**: No
- **Contacts**: No
- **App activity**: No (no analytics SDKs)
- **Web browsing**: No
- **App info and performance** (Crash logs, diagnostics): No
- **Device or other IDs**: No

---

## Section 3: Security Practices Declaration

Check the following checkboxes in Play Console:

1. [x] **Data is encrypted in transit**: All communication with Google Drive (when enabled by user) uses HTTPS/TLS encryption.
2. [x] **Data is encrypted at rest**: Data is protected on-device via SQLCipher AES-256 with Argon2id key derivation.
3. [x] **Users can request deletion of their data**: Users can wipe their vault at any time inside the app without needing to contact support.

---

## Section 4: Privacy Policy URL to Enter in Play Console

In Google Play Console → **Policy** → **App Content** → **Privacy policy**:
```
https://builtbyashish.com/btw-vault/privacy
```
(or `https://builtbyashish.com/btw-vault/`)
