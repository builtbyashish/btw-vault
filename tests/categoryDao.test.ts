import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SqlCipherService } from '../src/core/storage/sqlCipherService';
import { CategoryDao } from '../src/core/storage/categoryDao';
import { ItemDao } from '../src/core/storage/itemDao';
import { MockSqlDatabase } from './mockSqlDatabase';
import { CustomCategoryDefinition, VaultItem } from '../src/types';

describe('CategoryDao Custom Category Lifecycle Tests', () => {
  let mockDb: MockSqlDatabase;

  beforeEach(async () => {
    mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);
    await SqlCipherService.openVault(new Uint8Array(32));
  });

  it('inserts and retrieves custom categories with field schemas', async () => {
    const cat: CustomCategoryDefinition = {
      id: 'cat_servers',
      name: 'Server Credential',
      icon: 'Server',
      color: '#3B82F6',
      bgTint: '#1E293B',
      fields: [
        { id: 'f_ip', label: 'Server IP', type: 'text', required: true },
        { id: 'f_port', label: 'SSH Port', type: 'number', defaultValue: '22' },
        { id: 'f_key', label: 'SSH Private Key', type: 'key' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await CategoryDao.insertCategory(cat, 0);
    const retrieved = await CategoryDao.getCategoryById('cat_servers');

    assert.ok(retrieved);
    assert.strictEqual(retrieved!.name, 'Server Credential');
    assert.strictEqual(retrieved!.fields.length, 3);
    assert.strictEqual(retrieved!.fields[0].label, 'Server IP');
    assert.strictEqual(retrieved!.fields[2].type, 'key');
  });

  it('deleting a custom category atomically re-assigns orphaned items to "other"', async () => {
    const cat: CustomCategoryDefinition = {
      id: 'cat_crypto',
      name: 'Crypto Wallets',
      icon: 'Key',
      color: '#F59E0B',
      bgTint: '#451A03',
      fields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await CategoryDao.insertCategory(cat);

    const item: VaultItem = {
      id: 'crypto_item_1',
      title: 'Ledger Seed Phrase',
      category: 'cat_crypto',
      notes: '12 words backup seed',
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(item);

    // Verify item has category 'cat_crypto'
    const before = await ItemDao.getItemById('crypto_item_1');
    assert.strictEqual(before?.category, 'cat_crypto');

    // Delete custom category
    await CategoryDao.deleteCategory('cat_crypto');

    // Category should be gone
    const deletedCat = await CategoryDao.getCategoryById('cat_crypto');
    assert.strictEqual(deletedCat, null);

    // Orphaned item must now have category 'other'
    const after = await ItemDao.getItemById('crypto_item_1');
    assert.ok(after);
    assert.strictEqual(after!.category, 'other');
  });
});
