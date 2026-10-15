import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExportImportService } from '../src/core/migration/exportImportService';
import { VaultConfig, EncryptedPayload } from '../src/types';

describe('Export/Import Backup & Snapshot Fidelity Tests', () => {
  const dummyConfig: VaultConfig = {
    salt: 'c2FsdF9zYW1wbGVfMzJfYnl0ZXNfZm9yX3Rlc3Q=',
    verification: {
      salt: 'c2FsdA==',
      iv: 'aXZzYW1wbGU=',
      ciphertext: 'Y2lwaGVydGV4dF9zYW1wbGU=',
      tag: 'dGFnc2FtcGxl',
    },
    biometricEnabled: false,
    autoLockMinutes: 0,
    updatedAt: '2026-10-15T12:00:00.000Z',
  };

  it('builds and parses version 2 SQLCipher database snapshots in armored format', () => {
    const dummySnapshotBase64 = 'U1FMaXRlIGZvcm1hdCAzAAAEAAAA...mock_sqlite_db_bytes';

    const armored = ExportImportService.buildArmoredBackup(dummyConfig, {
      dbSnapshotBase64: dummySnapshotBase64,
    });

    assert.ok(armored.includes('-----BEGIN BTW VAULT BACKUP v1-----'));
    assert.ok(armored.includes('-----END BTW VAULT BACKUP-----'));

    const parsed = ExportImportService.parseBackupContent(armored);
    assert.strictEqual(parsed.version, 2);
    assert.strictEqual(parsed.dbSnapshotBase64, dummySnapshotBase64);
    assert.strictEqual(parsed.config.salt, dummyConfig.salt);
    assert.strictEqual(parsed.config.verification.ciphertext, dummyConfig.verification.ciphertext);
  });

  it('builds and parses legacy version 1 encrypted payloads with backward compatibility', () => {
    const dummyPayload: EncryptedPayload = {
      salt: 'c2FsdA==',
      iv: 'aXZzYW1wbGU=',
      ciphertext: 'dmF1bHRfY3J5cHRvX3RleHQ=',
      tag: 'dGFnX2tleQ==',
    };

    const armored = ExportImportService.buildArmoredBackup(dummyConfig, {
      payload: dummyPayload,
    });

    const parsed = ExportImportService.parseBackupContent(armored);
    assert.strictEqual(parsed.version, 1);
    assert.ok(parsed.payload);
    assert.strictEqual(parsed.payload!.ciphertext, dummyPayload.ciphertext);
    assert.strictEqual(parsed.config.salt, dummyConfig.salt);
  });

  it('rejects corrupted or truncated backup strings', () => {
    assert.throws(() => {
      ExportImportService.parseBackupContent('NOT_A_VALID_VAULT_BACKUP');
    }, /not a valid \.btw-vault or JSON backup document/);

    assert.throws(() => {
      ExportImportService.parseBackupContent('');
    }, /selected backup file is empty/);
  });

  it('rejects backup files exceeding maximum safe size of 25 MB', () => {
    // 25MB + 10 bytes string
    const giantContent = 'A'.repeat(25 * 1024 * 1024 + 10);
    assert.throws(() => {
      ExportImportService.parseBackupContent(giantContent);
    }, /exceeds maximum safe size/);
  });
});
