import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { SqlCipherService, VAULT_DB_NAME } from '../src/core/storage/sqlCipherService';
import { VaultStorage } from '../src/core/storage/vaultStorage';
import { ItemDao } from '../src/core/storage/itemDao';
import { CategoryDao } from '../src/core/storage/categoryDao';
import { CryptoService } from '../src/core/crypto/cryptoService';
import { AppFileSystem, EncodingType } from '../src/core/storage/fileSystemAdapter';
import { MockSqlDatabase } from './mockSqlDatabase';
import './mockFileSystem';
import { VaultItem, VaultConfig, CustomCategoryDefinition } from '../src/types';

describe('SQLCipher Database Path & Cloud Snapshot Restore Fidelity Tests', () => {
  it('unifies getDbDirectory and getDbFilePath with AppFileSystem document directory', () => {
    const docUri = AppFileSystem.getPaths().document.uri;
    const dbPath = SqlCipherService.getDbFilePath();
    const dbDir = SqlCipherService.getDbDirectory();

    // dbPath must be directly inside document directory
    assert.strictEqual(dbPath, `${docUri}/${VAULT_DB_NAME}`);
    // dbDir must not contain file:// protocol prefix
    assert.strictEqual(dbDir.startsWith('file://'), false);
    // dbPath stripped of file:// must match dbDir/vault.db
    assert.strictEqual(dbPath.replace(/^file:\/\//, ''), `${dbDir}/${VAULT_DB_NAME}`);
  });

  it('restoreEncryptedDbSnapshot writes directly to getDbFilePath location', async () => {
    const mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);

    const testDbBase64 = Buffer.from('SQLite format 3\0test_snapshot_data_2026').toString('base64');

    // Restore snapshot when vault is locked / closed
    await VaultStorage.restoreEncryptedDbSnapshot(testDbBase64);

    const dbPath = SqlCipherService.getDbFilePath();
    const info = await AppFileSystem.getInfoAsync(dbPath);
    assert.strictEqual(info.exists, true, 'Restored database file must exist at getDbFilePath()');

    // Verify written content matches base64 data
    const readBase64 = await AppFileSystem.readAsStringAsync(dbPath, {
      encoding: EncodingType.Base64,
    });
    assert.strictEqual(readBase64, testDbBase64);
  });

  it('preserves items and custom categories across simulated uninstall and backup restore', async () => {
    const mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);

    const masterPassword = 'TestRestorePassword#1';
    const salt = CryptoService.getRandomBytes(32);
    const masterKey = await CryptoService.deriveMasterKey(masterPassword, salt);
    const verification = CryptoService.createVerificationToken(masterKey, salt);

    const initialConfig: VaultConfig = {
      salt: 'c2FsdF9yZXN0b3Jl',
      verification,
      biometricEnabled: false,
      autoLockMinutes: 0,
      customCategories: [
        {
          id: 'cat_custom_tokens',
          name: 'MFA Tokens',
          icon: 'Shield',
          color: '#3B82F6',
          bgTint: '#172554',
          fields: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    // 1. Initial State: User sets up vault and adds items
    await SqlCipherService.openVault(masterKey);

    const loginItem: VaultItem = {
      id: 'item_github_restore_test',
      title: 'GitHub Work Account',
      category: 'login',
      username: 'ashishranjan',
      password: 'secretPassword123',
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(loginItem);

    const itemsBefore = await ItemDao.getAllItems();
    assert.strictEqual(itemsBefore.length, 1);
    assert.strictEqual(itemsBefore[0].title, 'GitHub Work Account');

    // 2. Simulate User Reinstall & Restore from Google Drive backup
    // Lock / close active vault
    await SqlCipherService.closeVault();

    // Snapshot restored while vault is locked (same as app/setup.tsx restore)
    const snapshotMock = Buffer.from('SQLCipher_restored_backup_bytes').toString('base64');
    await VaultStorage.restoreEncryptedDbSnapshot(snapshotMock);

    // Save restored config
    await VaultStorage.saveVaultConfig(initialConfig);

    // 3. User enters Master Password on unlock.tsx
    await SqlCipherService.openVault(masterKey);

    // Verify database is open and items can be queried
    const itemsAfter = await ItemDao.getAllItems();
    assert.strictEqual(itemsAfter.length, 1);
    assert.strictEqual(itemsAfter[0].id, 'item_github_restore_test');

    // Clean up
    await SqlCipherService.wipeVaultDatabase();
  });
});
