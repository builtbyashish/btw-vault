import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SqlCipherService } from '../src/core/storage/sqlCipherService';
import { ItemDao } from '../src/core/storage/itemDao';
import { MockSqlDatabase } from './mockSqlDatabase';
import { VaultItem } from '../src/types';

describe('ItemDao SQL Operations & Query Fidelity Tests', () => {
  let mockDb: MockSqlDatabase;

  beforeEach(async () => {
    mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);
    await SqlCipherService.openVault(new Uint8Array(32));
  });

  it('inserts and retrieves an item by ID with full fidelity', async () => {
    const item: VaultItem = {
      id: 'test_item_1',
      title: 'GitHub Login',
      category: 'login',
      username: 'octocat@github.com',
      password: 'super-secret-password-123',
      url: 'https://github.com/login',
      notes: 'Important developer account',
      isPinned: false,
      color: '#24292E',
      additionalUrls: ['https://gist.github.com'],
      tags: ['dev', 'git', 'work'],
      customFields: [
        { id: 'f1', label: '2FA Backup', value: 'ABCD-1234', type: 'text' },
      ],
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    };

    await ItemDao.insertItem(item);
    const retrieved = await ItemDao.getItemById('test_item_1');

    assert.ok(retrieved, 'Item must be retrieved');
    assert.strictEqual(retrieved!.id, 'test_item_1');
    assert.strictEqual(retrieved!.title, 'GitHub Login');
    assert.strictEqual(retrieved!.category, 'login');
    assert.strictEqual(retrieved!.username, 'octocat@github.com');
    assert.strictEqual(retrieved!.password, 'super-secret-password-123');
    assert.strictEqual(retrieved!.url, 'https://github.com/login');
    assert.strictEqual(retrieved!.notes, 'Important developer account');
    assert.strictEqual(retrieved!.isPinned, false);
    assert.deepStrictEqual(retrieved!.additionalUrls, ['https://gist.github.com']);
    assert.deepStrictEqual(retrieved!.tags, ['dev', 'git', 'work']);
    assert.strictEqual(retrieved!.customFields.length, 1);
    assert.strictEqual(retrieved!.customFields[0].value, 'ABCD-1234');
  });

  it('correctly serializes and stores credit card items with brand and last4', async () => {
    const cardItem: VaultItem = {
      id: 'card_item_1',
      title: 'HDFC Regalia Gold',
      category: 'card',
      color: '#1C3144',
      cardDetails: {
        cardholderName: 'Ashish Ranjan',
        cardNumber: '4111222233334567',
        cardNumberType: 'full',
        expiryDate: '12/28',
        cvv: '999',
        cardBrand: 'visa',
      },
      customFields: [],
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    };

    await ItemDao.insertItem(cardItem);

    // Verify raw row stored card_last4 as explicit column for fast lookups
    const rawRow = mockDb.tables.get('items')!.get('card_item_1');
    assert.ok(rawRow);
    assert.strictEqual(rawRow!.card_last4, '4567');
    assert.strictEqual(rawRow!.card_brand, 'visa');

    const retrieved = await ItemDao.getItemById('card_item_1');
    assert.ok(retrieved?.cardDetails);
    assert.strictEqual(retrieved!.cardDetails!.cardBrand, 'visa');
    assert.strictEqual(retrieved!.cardDetails!.cardNumber, '4111222233334567');
    assert.strictEqual(retrieved!.cardDetails!.expiryDate, '12/28');
  });

  it('orders items with pinned items first, then updated_at descending', async () => {
    const item1: VaultItem = {
      id: 'item_1',
      title: 'Item 1 (Older, Not Pinned)',
      category: 'login',
      isPinned: false,
      customFields: [],
      createdAt: '2026-10-15T08:00:00.000Z',
      updatedAt: '2026-10-15T08:00:00.000Z',
    };
    const item2: VaultItem = {
      id: 'item_2',
      title: 'Item 2 (Newer, Not Pinned)',
      category: 'login',
      isPinned: false,
      customFields: [],
      createdAt: '2026-10-15T09:00:00.000Z',
      updatedAt: '2026-10-15T09:00:00.000Z',
    };
    const item3: VaultItem = {
      id: 'item_3',
      title: 'Item 3 (Oldest, But PINNED)',
      category: 'note',
      isPinned: true,
      customFields: [],
      createdAt: '2026-10-15T07:00:00.000Z',
      updatedAt: '2026-10-15T07:00:00.000Z',
    };

    await ItemDao.insertItem(item1);
    await ItemDao.insertItem(item2);
    await ItemDao.insertItem(item3);

    const all = await ItemDao.getAllItems();
    assert.strictEqual(all.length, 3);
    // Pinned item must be first
    assert.strictEqual(all[0].id, 'item_3');
    // Newer unpinned item must be second
    assert.strictEqual(all[1].id, 'item_2');
    // Older unpinned item must be last
    assert.strictEqual(all[2].id, 'item_1');
  });

  it('toggles pin status correctly', async () => {
    const item: VaultItem = {
      id: 'pin_test',
      title: 'Pin Test',
      category: 'note',
      isPinned: false,
      customFields: [],
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    };
    await ItemDao.insertItem(item);

    const isPinnedNow = await ItemDao.togglePin('pin_test');
    assert.strictEqual(isPinnedNow, true);

    const isPinnedAgain = await ItemDao.togglePin('pin_test');
    assert.strictEqual(isPinnedAgain, false);
  });

  it('performs batch insert inside an atomic transaction', async () => {
    const items: VaultItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: `batch_item_${i}`,
      title: `Account #${i}`,
      category: 'login',
      username: `user_${i}@example.com`,
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await ItemDao.insertItemsBatch(items);
    const count = await ItemDao.countItems();
    assert.strictEqual(count, 50);
  });

  it('searches items across title, username, url, and notes', async () => {
    const itemA: VaultItem = {
      id: 'search_1',
      title: 'AWS Production Console',
      category: 'login',
      username: 'devops-lead',
      url: 'https://console.aws.amazon.com',
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const itemB: VaultItem = {
      id: 'search_2',
      title: 'Personal Wifi',
      category: 'note',
      notes: 'WPA3 passkey with high security',
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(itemA);
    await ItemDao.insertItem(itemB);

    const resultsAws = await ItemDao.searchItems('console');
    assert.strictEqual(resultsAws.length, 1);
    assert.strictEqual(resultsAws[0].id, 'search_1');

    const resultsWifi = await ItemDao.searchItems('WPA3');
    assert.strictEqual(resultsWifi.length, 1);
    assert.strictEqual(resultsWifi[0].id, 'search_2');
  });

  it('deletes an item by ID', async () => {
    const item: VaultItem = {
      id: 'del_me',
      title: 'To Delete',
      category: 'login',
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ItemDao.insertItem(item);
    assert.strictEqual(await ItemDao.countItems(), 1);

    await ItemDao.deleteItem('del_me');
    assert.strictEqual(await ItemDao.countItems(), 0);
    assert.strictEqual(await ItemDao.getItemById('del_me'), null);
  });
});
