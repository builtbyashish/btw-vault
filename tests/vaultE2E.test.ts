import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { SqlCipherService } from '../src/core/storage/sqlCipherService';
import { ItemDao } from '../src/core/storage/itemDao';
import { CategoryDao } from '../src/core/storage/categoryDao';
import { CryptoService } from '../src/core/crypto/cryptoService';
import { ExportImportService } from '../src/core/migration/exportImportService';
import { MockSqlDatabase } from './mockSqlDatabase';
import { VaultItem, VaultConfig, CustomCategoryDefinition } from '../src/types';

describe('Vault Full Lifecycle E2E Test Suite', () => {
  it('executes full setup -> unlock -> CRUD -> snapshot -> wipe lifecycle', async () => {
    // 1. Setup Phase
    const mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);

    const masterPassword = 'MasterPassword@2026!';
    const salt = CryptoService.getRandomBytes(32);
    const masterKey = await CryptoService.deriveMasterKey(masterPassword, salt);
    const verification = CryptoService.createVerificationToken(masterKey, salt);

    const config: VaultConfig = {
      salt: 'c2FsdF90ZXN0',
      verification,
      biometricEnabled: false,
      autoLockMinutes: 0,
      updatedAt: new Date().toISOString(),
    };

    // Open SQLCipher database
    await SqlCipherService.openVault(masterKey);
    assert.strictEqual(SqlCipherService.isVaultOpen(), true);

    // 2. Add Login Item
    const loginItem: VaultItem = {
      id: 'item_login_e2e',
      title: 'GitHub Production',
      category: 'login',
      username: 'lead-architect',
      password: 'vault-password-xyz',
      url: 'https://github.com',
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(loginItem);

    // 3. Add Credit Card Item with brand & last4
    const cardItem: VaultItem = {
      id: 'item_card_e2e',
      title: 'Business Corporate Card',
      category: 'card',
      color: '#1E293B',
      cardDetails: {
        cardholderName: 'Ashish Ranjan',
        cardNumber: '4242424242424242',
        cardNumberType: 'full',
        expiryDate: '09/29',
        cardBrand: 'visa',
      },
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(cardItem);

    // 4. Add Custom Category & item in that category
    const customCat: CustomCategoryDefinition = {
      id: 'cat_api_keys',
      name: 'API Keys & Secrets',
      icon: 'Key',
      color: '#10B981',
      bgTint: '#064E3B',
      fields: [
        { id: 'f_key', label: 'Secret Key', type: 'key', required: true },
        { id: 'f_env', label: 'Environment', type: 'select', options: ['prod', 'dev', 'staging'] },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await CategoryDao.insertCategory(customCat);

    const apiKeyItem: VaultItem = {
      id: 'item_api_e2e',
      title: 'OpenAI Enterprise Key',
      category: 'cat_api_keys',
      customFields: [
        { id: 'f_key', label: 'Secret Key', value: 'sk-proj-abc123xyz', type: 'key' },
        { id: 'f_env', label: 'Environment', value: 'prod', type: 'select' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(apiKeyItem);

    // Verify 3 items exist in database
    const totalCount = await ItemDao.countItems();
    assert.strictEqual(totalCount, 3);

    // 5. Query & Search verification
    const allItems = await ItemDao.getAllItems();
    assert.strictEqual(allItems.length, 3);

    const searchResults = await ItemDao.searchItems('OpenAI');
    assert.strictEqual(searchResults.length, 1);
    assert.strictEqual(searchResults[0].id, 'item_api_e2e');

    // 6. Toggle Pin
    const isPinned = await ItemDao.togglePin('item_card_e2e');
    assert.strictEqual(isPinned, true);
    const sorted = await ItemDao.getAllItems();
    // Pinned card must be first in list
    assert.strictEqual(sorted[0].id, 'item_card_e2e');

    // 7. Atomic Snapshot Generation (Zero-Locking Backup)
    const snapshotPath = '/cache/vault_snapshot_test.db';
    await SqlCipherService.createSnapshot(snapshotPath);
    const vacuumExecuted = mockDb.executedQueries.some((q) => q.query.includes('VACUUM INTO'));
    assert.ok(vacuumExecuted, 'VACUUM INTO must be executed during snapshot');

    // 8. Armored Backup serialization
    const armored = ExportImportService.buildArmoredBackup(config, {
      dbSnapshotBase64: 'mock_encrypted_database_base64_payload',
    });
    const parsed = ExportImportService.parseBackupContent(armored);
    assert.strictEqual(parsed.version, 2);
    assert.strictEqual(parsed.dbSnapshotBase64, 'mock_encrypted_database_base64_payload');

    // 9. Lock Vault & Zeroization
    await SqlCipherService.closeVault();
    assert.strictEqual(SqlCipherService.isVaultOpen(), false);

    // Verify calling ItemDao when locked throws descriptive error
    await assert.rejects(async () => {
      await ItemDao.getAllItems();
    }, /Vault database is locked or uninitialized/);

    // 10. Unlock with candidate password
    const isCorrectKey = CryptoService.verifyMasterKey(masterKey, config.verification);
    assert.strictEqual(isCorrectKey, true);

    const wrongKey = CryptoService.getRandomBytes(32);
    const isWrongKey = CryptoService.verifyMasterKey(wrongKey, config.verification);
    assert.strictEqual(isWrongKey, false);

    // Re-open with valid key
    await SqlCipherService.openVault(masterKey);
    assert.strictEqual(SqlCipherService.isVaultOpen(), true);
    const postReopenCount = await ItemDao.countItems();
    assert.strictEqual(postReopenCount, 3);

    // 11. Wipe Database
    await SqlCipherService.wipeVaultDatabase();
    assert.strictEqual(SqlCipherService.isVaultOpen(), false);
  });
});
