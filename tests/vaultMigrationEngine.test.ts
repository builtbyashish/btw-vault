import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SqlCipherService } from '../src/core/storage/sqlCipherService';
import { VaultMigrationEngine } from '../src/core/migration/vaultMigrationEngine';
import { VaultStorage } from '../src/core/storage/vaultStorage';
import { AppFileSystem } from '../src/core/storage/fileSystemAdapter';
import { ItemDao } from '../src/core/storage/itemDao';
import { CryptoService } from '../src/core/crypto/cryptoService';
import { MockSqlDatabase } from './mockSqlDatabase';
import './mockFileSystem';
import { VaultItem } from '../src/types';

describe('VaultMigrationEngine Zero-Data-Loss Migration Tests', () => {
  let mockDb: MockSqlDatabase;
  const dummyMasterKey = new Uint8Array(32).fill(0x42);
  const dummySalt = new Uint8Array(32).fill(0x11);

  beforeEach(async () => {
    mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);
    await SqlCipherService.openVault(dummyMasterKey);
  });

  it('marks migration as completed when no legacy vault.enc exists', async () => {
    // Ensure mock storage returns null for legacy vault
    VaultStorage.loadEncryptedVault = async () => null;

    const result = await VaultMigrationEngine.checkAndMigrate(dummyMasterKey);
    assert.strictEqual(result.migrated, false);

    // Verify metadata recorded migration_completed = 'true'
    assert.strictEqual(mockDb.metadata.get('migration_completed'), 'true');
  });

  it('successfully migrates all items from legacy vault.enc to SQLCipher', async () => {
    const legacyItems: VaultItem[] = [
      {
        id: 'legacy_1',
        title: 'Personal Email',
        category: 'login',
        username: 'user@gmail.com',
        password: 'mypassword',
        customFields: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'legacy_2',
        title: 'Mastercard Debit',
        category: 'card',
        cardDetails: {
          cardholderName: 'User Name',
          cardNumber: '5100123456789012',
          cardBrand: 'mastercard',
        },
        customFields: [],
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'legacy_3',
        title: 'Passport Notes',
        category: 'note',
        notes: 'Secret passport numbers',
        customFields: [],
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ];

    // Encrypt items using real CryptoService AES-GCM
    const encryptedPayload = CryptoService.encryptVaultItems(
      legacyItems,
      dummyMasterKey,
      dummySalt
    );

    // Write legacy vault.enc file using AppFileSystem
    const legacyPath = `${AppFileSystem.getPaths().document.uri}/vault.enc`;
    await AppFileSystem.writeAsStringAsync(legacyPath, JSON.stringify(encryptedPayload));

    // Mock VaultStorage to return this encrypted payload
    VaultStorage.loadEncryptedVault = async () => encryptedPayload;
    VaultStorage.loadVaultConfig = async () => ({
      salt: 'c2FsdA==',
      verification: CryptoService.createVerificationToken(dummyMasterKey, dummySalt),
      biometricEnabled: false,
      autoLockMinutes: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
      customCategories: [],
    });

    // Run migration
    const result = await VaultMigrationEngine.checkAndMigrate(dummyMasterKey);

    assert.strictEqual(result.migrated, true);
    assert.strictEqual(result.itemCount, 3);

    // Verify all 3 items exist in SQLCipher via ItemDao
    const allItems = await ItemDao.getAllItems();
    assert.strictEqual(allItems.length, 3);

    const emailItem = await ItemDao.getItemById('legacy_1');
    assert.strictEqual(emailItem?.username, 'user@gmail.com');

    const cardItem = await ItemDao.getItemById('legacy_2');
    assert.strictEqual(cardItem?.cardDetails?.cardNumber, '5100123456789012');

    // Verify migration flags in metadata
    assert.strictEqual(mockDb.metadata.get('migration_completed'), 'true');
    assert.strictEqual(mockDb.metadata.get('migrated_items_count'), '3');

    // Subsequent call must be idempotent and return migrated: false
    const secondCall = await VaultMigrationEngine.checkAndMigrate(dummyMasterKey);
    assert.strictEqual(secondCall.migrated, false);
  });
});
