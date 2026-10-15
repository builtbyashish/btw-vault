import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SqlCipherService,
  masterKeyToHexKey,
} from '../src/core/storage/sqlCipherService';
import { MockSqlDatabase } from './mockSqlDatabase';

describe('SQLCipher Service & Budget Phone Optimization Tests', () => {
  it('masterKeyToHexKey generates exact 67-character x\'...\' raw key format', () => {
    // 32-byte dummy master key
    const masterKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) masterKey[i] = i;

    const hexKey = masterKeyToHexKey(masterKey);
    // x' (2 chars) + 64 hex chars + ' (1 char) = 67 chars
    assert.strictEqual(hexKey.length, 67);
    assert.ok(hexKey.startsWith("x'"), "Must start with x'");
    assert.ok(hexKey.endsWith("'"), "Must end with '");
    assert.strictEqual(
      hexKey,
      "x'000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'"
    );
  });

  it('configures all budget Android phone PRAGMAs on database initialization', async () => {
    const mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);

    const dummyKey = new Uint8Array(32).fill(0xaa);
    await SqlCipherService.openVault(dummyKey);

    // Verify WAL mode is set
    assert.strictEqual(mockDb.pragmaValues.get('journal_mode')?.toUpperCase(), 'WAL');

    // Verify synchronous = NORMAL for eMMC flash wear reduction
    assert.strictEqual(mockDb.pragmaValues.get('synchronous')?.toUpperCase(), 'NORMAL');

    // Verify page_size = 4096 (standard Linux/Android block size)
    assert.strictEqual(mockDb.pragmaValues.get('page_size'), '4096');

    // Verify strict RAM ceiling of 2MB page cache (-2048)
    assert.strictEqual(mockDb.pragmaValues.get('cache_size'), '-2048');

    // Verify temp_store = MEMORY (zero flash wear on disk)
    assert.strictEqual(mockDb.pragmaValues.get('temp_store')?.toUpperCase(), 'MEMORY');

    // Verify auto_vacuum = INCREMENTAL (eliminates UI compaction freezes)
    assert.strictEqual(mockDb.pragmaValues.get('auto_vacuum')?.toUpperCase(), 'INCREMENTAL');

    // Verify required tables were created
    assert.ok(mockDb.tables.has('items'), 'items table must be created');
    assert.ok(mockDb.tables.has('custom_categories'), 'custom_categories table must be created');
    assert.ok(mockDb.tables.has('vault_metadata'), 'vault_metadata table must be created');

    await SqlCipherService.closeVault();
    assert.strictEqual(SqlCipherService.isVaultOpen(), false);
  });

  it('createSnapshot executes wal_checkpoint(PASSIVE) and VACUUM INTO', async () => {
    const mockDb = new MockSqlDatabase();
    SqlCipherService.setTestDatabase(mockDb);

    const dummyKey = new Uint8Array(32).fill(0x55);
    await SqlCipherService.openVault(dummyKey);

    const snapshotDest = '/data/cache/vault_snapshot.db';
    await SqlCipherService.createSnapshot(snapshotDest);

    const checkpointQuery = mockDb.executedQueries.find((q) =>
      q.query.includes('wal_checkpoint(PASSIVE)')
    );
    assert.ok(checkpointQuery, 'wal_checkpoint(PASSIVE) must be executed');

    const vacuumQuery = mockDb.executedQueries.find((q) =>
      q.query.includes('VACUUM INTO')
    );
    assert.ok(vacuumQuery, 'VACUUM INTO must be executed');
    assert.ok(vacuumQuery!.query.includes(snapshotDest));

    await SqlCipherService.closeVault();
  });
});
