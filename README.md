# btw vault 🔐

[![CI & Unit Tests](https://github.com/builtbyashish/btw-vault/actions/workflows/test.yml/badge.svg)](https://github.com/builtbyashish/btw-vault/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Google Play](https://img.shields.io/badge/Google_Play-Get_it_on_Google_Play-4285F4?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.btwvault.app&pcampaignid=web_share)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://github.com/builtbyashish/btw-vault/releases)
[![Security: Zero--Knowledge](https://img.shields.io/badge/Security-Zero--Knowledge-10B981.svg)](#security-architecture)

> **Zero-Knowledge, Offline-First Personal Cryptographic Vault.**  
> Store your logins, payment cards, private notes, and custom categories securely on your device with military-grade encryption. No tracking, no ads, no telemetry, no mandatory cloud accounts.

---

## 📥 Download

- **Google Play Store**: [Get it on Google Play](https://play.google.com/store/apps/details?id=com.btwvault.app&pcampaignid=web_share)
- **Direct APK / AAB**: [Latest GitHub Releases](https://github.com/builtbyashish/btw-vault/releases/latest)

---

## ✨ Features

- **🛡️ True Zero-Knowledge Security**: Your master password is never stored or transmitted anywhere. 
- **⚡ SQLCipher Native C++ JSI Engine**: Ultra-fast relational database storage encrypted page-by-page using AES-256.
- **🔒 Argon2id Memory-Hard Key Derivation**: Neutralizes GPU and ASIC dictionary attacks (4MB RAM, 2 iterations, cryptographically unique 256-bit salt).
- **📱 Biometric Hardware Authentication**: Unlock instantly with Android BiometricPrompt (Fingerprint / Face Unlock).
- **📂 Flexible Categorization & Schemas**:
  - **Built-in categories**: Logins, Credit Cards, Secure Notes.
  - **Custom categories**: Build custom item schemas with text, numbers, dropdowns, dates, and secret masked fields.
  - **Custom Pinning**: Pin and unpin your favorite categories to the Home action bar and speed-dial FAB.
- **☁️ Zero-Locking Encrypted Backups**:
  - Export and import armored AES-encrypted database snapshots.
  - Optional Google Drive cloud backup using atomic `VACUUM INTO` snapshots with zero UI locking.
- **🛡️ Screen Protection & Clipboard Auto-Clear**: Automatically prevents screen capture on Android and wipes sensitive clipboard contents.
- **🚀 Budget Phone Optimized**: Strict memory ceiling and Write-Ahead Logging (WAL) ensure buttery smooth 60fps scrolling on budget Android devices.

---

## 🔒 Security Architecture

```
[ Master Password ]
         │
         ▼
[ Argon2id KDF (4MB RAM, 2 iterations, 256-bit Salt) ]
         │
         ▼
[ 256-bit Raw Master Key ]
         │
         ▼
[ SQLCipher AES-256 Database Engine (Native C++ JSI) ]
         │
         ├── Encrypted Items & Credentials
         ├── Encrypted Credit Cards & PINs
         └── Encrypted Custom Categories
```

1. **Argon2id Key Derivation**: When setting up the vault, your master password passes through memory-hard Argon2id to derive a 32-byte raw AES key.
2. **Page-by-Page Encryption**: All database pages on disk are encrypted using SQLCipher AES-256.
3. **RAM Sanitation**: Raw keys are held strictly in ephemeral memory and discarded on app backgrounding or timeout.

---

## 🛠️ Tech Stack

- **Framework**: [React Native 0.86](https://reactnative.dev/) with **New Architecture** enabled.
- **Runtime & Tooling**: [Expo SDK 57](https://expo.dev/) with [Expo Router](https://docs.expo.dev/router/introduction/).
- **Database**: [`@op-engineering/op-sqlite`](https://github.com/OP-Engineering/op-sqlite) with native SQLCipher JSI.
- **Cryptography**: [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) & [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers).
- **Icons & UI**: [`lucide-react-native`](https://lucide.dev/), React Native Reanimated.
- **Language**: TypeScript 5.8+ (Strict Typechecking).

---

## 🚀 Quick Start (Development)

### Prerequisites

- **Node.js**: v20 or higher
- **Package Manager**: `npm`
- **Android Development**: Android Studio, Android SDK 34+, and JDK 17

### 1. Clone the Repository
```bash
git clone https://github.com/builtbyashish/btw-vault.git
cd btw-vault
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Provide your own Google OAuth Client IDs if testing cloud backup).*

### 4. Run Development Server
```bash
# Start Metro bundler
npm run start

# Run on Android device or emulator
npm run android
```

---

## 🧪 Testing & Verification

Unit and E2E lifecycle tests run locally using Node's native test runner and TypeScript execution:

```bash
# Run all unit and integration test suites
npm test

# Run TypeScript compile-time type verification
npx tsc --noEmit
```

---

## 🤝 Contributing

We welcome community contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting a pull request.

- All pull requests should target the `develop` branch.
- Ensure `npm test` and `npx tsc --noEmit` pass with zero errors.

---

## 🛡️ Security Vulnerabilities

If you discover a security vulnerability, please review our [SECURITY.md](SECURITY.md) policy and report it responsibly. Please **do not** open public GitHub issues for security vulnerabilities.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
