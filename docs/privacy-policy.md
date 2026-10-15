# Privacy Policy for btw vault

**Last Updated**: October 15, 2026  
**Effective Date**: October 15, 2026  
**Developer**: Ashish Ranjan  
**Contact**: support@builtbyashish.com / ashishranjan.AR7@gmail.com  
**Website**: [https://builtbyashish.com/btw-vault/](https://builtbyashish.com/btw-vault/)

---

## 1. Overview & Core Philosophy
**btw vault** is an offline-first, zero-knowledge personal cryptographic vault designed to store passwords, payment cards, secure notes, and custom categories. 

Our core architectural principle is simple: **we cannot see, access, sell, track, or share your data.** 

* **No Remote Servers**: btw vault has no backend database, analytics servers, or tracking pipelines.
* **Zero Telemetry**: We do not collect device identifiers, crash logs, IP addresses, or behavioral telemetry.
* **Zero Advertising**: The application is 100% ad-free and contains no third-party tracking SDKs.

---

## 2. Information We Handle

### A. Vault Data (Credentials, Notes, Cards, Categories)
* All credentials, usernames, passwords, credit card numbers, notes, and custom fields entered by you are encrypted locally on your device using **SQLCipher (AES-256 in CBC mode)**.
* Your **Master Password** is processed exclusively in-memory through the **Argon2id** memory-hard key derivation function (2 iterations, 4MB RAM memory cost, 256-bit unique cryptographically secure salt). 
* The Master Password is never written to disk, never cached in unencrypted storage, and never transmitted over the internet.

### B. Biometric Authentication
* If you enable Biometric Unlock (Fingerprint / Face ID), authentication is handled entirely by your device operating system via the Android Keystore / iOS Secure Enclave.
* Biometric data never leaves the hardware security module and is never accessible to the app or developer.

### C. Optional Google Drive Cloud Backup
* If you explicitly choose to connect Google Drive, btw vault uses Google OAuth 2.0 to upload an encrypted backup snapshot container (`vault_backup.btw-vault`).
* **End-to-End Encryption**: The backup container is encrypted client-side using your derived master key **before** it is transmitted to Google Drive.
* **Storage Location**: The backup is stored solely in your personal Google Drive within a dedicated app data folder. Google, third parties, and the developer have no cryptographic means to decrypt or read your vault contents.
* **OAuth Permissions**: btw vault only requests `https://www.googleapis.com/auth/drive.appdata` or `drive.file` scope, granting access only to files created by the app itself. The app cannot read any other files or folders in your Google Drive.

---

## 3. Data Retention and Deletion
* **Complete User Ownership**: You have complete control over all data stored in the application.
* **Instant Wipe**: You can tap **"Wipe Vault"** in Settings at any time. This permanently deletes the SQLCipher database (`vault.db`), write-ahead log buffers, security configuration, and all derived encryption keys from your device.
* **Cloud Deletion**: You can delete the cloud backup at any time directly through Google Drive or by disconnecting your account in the app.

---

## 4. Children’s Privacy
btw vault does not knowingly collect or solicit personal information from children under the age of 13. Because no personal data is collected or transmitted, the app is safe for general audiences.

---

## 5. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date.

---

## 6. Contact Information
If you have any questions or feedback regarding this Privacy Policy or your privacy when using btw vault, please contact:

* **Developer**: Ashish Ranjan
* **Email**: support@builtbyashish.com / ashishranjan.AR7@gmail.com
* **Website**: [https://builtbyashish.com/btw-vault/](https://builtbyashish.com/btw-vault/)
