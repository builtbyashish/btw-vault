# Contributing to btw vault

Thank you for your interest in contributing to **btw vault**! We are building an offline-first, zero-knowledge, privacy-respecting password manager and personal vault.

Please review this guide before submitting issues or pull requests.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all contributors with respect and kindness.

---

## 🌿 Branching Strategy

We follow a GitFlow-inspired branching strategy:

- **`main`**: Protected branch reserved strictly for verified production releases and Play Store builds. **Do not submit PRs directly to `main`**.
- **`develop`**: Primary integration and development branch. **All feature and bugfix PRs must target `develop`**.
- **Feature Branches**: Branch off from `develop` using descriptive names:
  - `feat/category-reordering`
  - `fix/argon2-memory-boundary`
  - `docs/setup-instructions`

---

## 🛠️ Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/<your-username>/btw-vault.git
   cd btw-vault
   git checkout develop
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

4. **Verify Your Environment**:
   Ensure all existing tests pass before making changes:
   ```bash
   npm test
   npx tsc --noEmit
   ```

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure you have:
1. Written tests for new features or bug fixes in the `tests/` directory.
2. Verified that all existing unit and E2E suites pass:
   ```bash
   npm test
   ```
3. Verified strict TypeScript type safety without errors:
   ```bash
   npx tsc --noEmit
   ```

---

## 📝 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope): add support for fingerprint prompt customization`
- `fix(categories): prevent auto-pin override when unpinning custom category`
- `docs: update setup instructions in README`
- `chore: bump dependencies`

---

## 🚀 Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```
2. Open a Pull Request targeting **`develop`**.
3. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Ensure CI checks pass.
5. Maintainers will review your PR and provide constructive feedback!
