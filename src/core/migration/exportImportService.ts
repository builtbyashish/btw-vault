import { EncryptedPayload, VaultConfig } from '../../types';
import { VaultStorage } from '../storage/vaultStorage';
import { SqlCipherService } from '../storage/sqlCipherService';
import { AppFileSystem, EncodingType } from '../storage/fileSystemAdapter';
import {
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  bytesToString,
} from '../crypto/cryptoService';
import { AppSecurityService } from '../security/appSecurityService';
import { VAULT_LIMITS } from '../security/vaultLimits';

export interface ExportBackupData {
  version: 1 | 2;
  config: VaultConfig;
  payload?: EncryptedPayload;
  dbSnapshotBase64?: string;
  exportedAt: string;
}

export interface ExportResult {
  success: boolean;
  fileName?: string;
  canceled?: boolean;
  destination?: string;
}

const VAULT_ARMOR_HEADER = '-----BEGIN BTW VAULT BACKUP v1-----';
const VAULT_ARMOR_FOOTER = '-----END BTW VAULT BACKUP-----';
const EXPORT_DIR_STORAGE_KEY = '@btw_vault_export_dir_uri';

function getPlatformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native').Platform.OS;
  } catch {
    return 'node';
  }
}

function getAsyncStorage(): typeof import('@react-native-async-storage/async-storage').default | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
}

export class ExportImportService {
  /**
   * Clear remembered export directory URI
   */
  static async resetExportDirectory(): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (storage) {
        await storage.removeItem(EXPORT_DIR_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Get remembered export directory URI
   */
  static async getSavedExportDirectory(): Promise<string | null> {
    try {
      const storage = getAsyncStorage();
      if (storage) {
        return await storage.getItem(EXPORT_DIR_STORAGE_KEY);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Builds an armored .btw-vault container string from config and payload or SQLCipher snapshot
   */
  static buildArmoredBackup(
    config: VaultConfig,
    payloadOrSnapshot: { payload?: EncryptedPayload; dbSnapshotBase64?: string }
  ): string {
    const isV2 = Boolean(payloadOrSnapshot.dbSnapshotBase64);
    const backupData: ExportBackupData = {
      version: isV2 ? 2 : 1,
      config,
      payload: payloadOrSnapshot.payload,
      dbSnapshotBase64: payloadOrSnapshot.dbSnapshotBase64,
      exportedAt: new Date().toISOString(),
    };
    const rawJson = JSON.stringify(backupData);
    const base64Armored = bytesToBase64(stringToBytes(rawJson));
    return `${VAULT_ARMOR_HEADER}\n${base64Armored}\n${VAULT_ARMOR_FOOTER}`;
  }

  /**
   * Loads current vault config + SQLCipher snapshot or legacy payload and generates the armored container string
   */
  static async getArmoredVaultBackup(): Promise<string> {
    const config = await VaultStorage.loadVaultConfig();
    if (!config) {
      throw new Error('No vault configuration found to export');
    }

    // 1. If SQLCipher database is currently active, create a zero-locking atomic snapshot
    if (SqlCipherService.isVaultOpen()) {
      const cacheDir = AppFileSystem.getPaths().cache.uri;
      const tempSnapshotPath = `${cacheDir}/vault_snapshot_${Date.now()}.db`;
      try {
        await SqlCipherService.createSnapshot(tempSnapshotPath);
        const snapshotBase64 = await AppFileSystem.readAsStringAsync(tempSnapshotPath, {
          encoding: EncodingType.Base64,
        });

        // Clean up temporary cache snapshot
        try {
          await AppFileSystem.deleteAsync(tempSnapshotPath);
        } catch {
          // Ignore
        }

        return this.buildArmoredBackup(config, { dbSnapshotBase64: snapshotBase64 });
      } catch (snapshotErr) {
        console.warn('SQLCipher snapshot failed, falling back to local payload:', snapshotErr);
        // Clean up on error
        try {
          await AppFileSystem.deleteAsync(tempSnapshotPath);
        } catch {
          // Ignore
        }
      }
    }

    // 2. Fallback to legacy encrypted vault file if present
    const legacyPayload = await VaultStorage.loadEncryptedVault();
    if (legacyPayload) {
      return this.buildArmoredBackup(config, { payload: legacyPayload });
    }

    throw new Error('No active database or vault data found to export');
  }

  /**
   * Export encrypted vault backup file (.vault) directly to device storage
   */
  static async exportBackup(): Promise<ExportResult> {
    try {
      const fileContent = await this.getArmoredVaultBackup();

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const fileName = `export_${dateStr}_${timeStr}.btw-vault`;

      // 1. Android: Save directly to device storage via SAF
      const os = getPlatformOS();
      let legacyFs: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        legacyFs = require('expo-file-system/legacy');
      } catch {
        legacyFs = null;
      }

      const storage = getAsyncStorage();

      if (os === 'android' && legacyFs?.StorageAccessFramework?.createFileAsync) {
        try {
          let savedDirUri = storage ? await storage.getItem(EXPORT_DIR_STORAGE_KEY) : null;

          if (savedDirUri) {
            try {
              const fileUri = await legacyFs.StorageAccessFramework.createFileAsync(
                savedDirUri,
                fileName,
                'application/octet-stream'
              );

              await AppFileSystem.writeAsStringAsync(fileUri, fileContent, {
                encoding: EncodingType.UTF8,
              });

              return { success: true, fileName, destination: 'Device' };
            } catch (savedWriteErr) {
              console.warn('Cached export directory URI invalid or revoked, clearing:', savedWriteErr);
              if (storage) {
                await storage.removeItem(EXPORT_DIR_STORAGE_KEY);
              }
              savedDirUri = null;
            }
          }

          AppSecurityService.setSystemActivityActive(true);
          try {
            const permissions =
              await legacyFs.StorageAccessFramework.requestDirectoryPermissionsAsync();

            if (!permissions.granted) {
              return { success: false, canceled: true };
            }

            if (storage) {
              await storage.setItem(EXPORT_DIR_STORAGE_KEY, permissions.directoryUri);
            }

            const fileUri = await legacyFs.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/octet-stream'
            );

            await AppFileSystem.writeAsStringAsync(fileUri, fileContent, {
              encoding: EncodingType.UTF8,
            });

            return { success: true, fileName, destination: 'Device' };
          } finally {
            setTimeout(() => {
              AppSecurityService.setSystemActivityActive(false);
            }, 1000);
          }
        } catch (safErr) {
          console.warn('StorageAccessFramework export failed, falling back to Share sheet:', safErr);
        }
      }

      // 2. iOS & Fallback: Cache file locally and trigger native system Share sheet
      const tempPath = `${AppFileSystem.getPaths().cache.uri}/${fileName}`;
      await AppFileSystem.writeAsStringAsync(tempPath, fileContent, {
        encoding: EncodingType.UTF8,
      });

      let SharingModule: typeof import('expo-sharing') | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        SharingModule = require('expo-sharing');
      } catch {
        SharingModule = null;
      }

      if (!SharingModule || !(await SharingModule.isAvailableAsync())) {
        return { success: false, fileName };
      }

      AppSecurityService.setSystemActivityActive(true);
      try {
        await SharingModule.shareAsync(tempPath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Save Encrypted Vault Backup',
          UTI: 'public.data',
        });
        return { success: true, fileName, destination: 'Share' };
      } finally {
        setTimeout(() => {
          AppSecurityService.setSystemActivityActive(false);
        }, 1000);
      }
    } catch (e: any) {
      throw new Error(`Export failed: ${e.message || 'Could not export backup'}`);
    }
  }

  /**
   * Import encrypted vault backup (.btw-vault or .json) from device file picker
   */
  static async importBackup(): Promise<ExportBackupData> {
    let DocumentPickerModule: typeof import('expo-document-picker') | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      DocumentPickerModule = require('expo-document-picker');
    } catch {
      DocumentPickerModule = null;
    }

    if (!DocumentPickerModule) {
      throw new Error('Document picker is not available on this platform.');
    }

    AppSecurityService.setSystemActivityActive(true);
    let result: import('expo-document-picker').DocumentPickerResult;
    try {
      result = await DocumentPickerModule.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });
    } finally {
      setTimeout(() => {
        AppSecurityService.setSystemActivityActive(false);
      }, 1000);
    }

    if (result.canceled || !result.assets || result.assets.length === 0) {
      throw new Error('Import canceled');
    }

    const fileUri = result.assets[0].uri;

    const fileInfo = await AppFileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('Selected backup file could not be accessed.');
    }
    if ('size' in fileInfo && typeof fileInfo.size === 'number') {
      if (fileInfo.size > VAULT_LIMITS.MAX_BACKUP_FILE_BYTES) {
        throw new Error(
          `Backup file size (${(fileInfo.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit (25 MB).`
        );
      }
    }

    const rawContent = await AppFileSystem.readAsStringAsync(fileUri, {
      encoding: EncodingType.UTF8,
    });

    return this.parseBackupContent(rawContent);
  }

  /**
   * Parses and validates raw backup content (armored .btw-vault v1/v2 or legacy JSON)
   */
  static parseBackupContent(rawContent: string): ExportBackupData {
    const content = rawContent.trim();
    if (!content) {
      throw new Error('The selected backup file is empty.');
    }
    if (content.length > VAULT_LIMITS.MAX_BACKUP_FILE_BYTES) {
      throw new Error('The selected backup file exceeds maximum safe size (25 MB).');
    }

    let parsed: any;

    // 1. Check for armored .btw-vault format
    if (content.includes('BEGIN BTW VAULT BACKUP')) {
      try {
        const lines = content.split('\n');
        const payloadLines = lines.filter(
          (line) =>
            !line.startsWith('-----BEGIN') &&
            !line.startsWith('-----END') &&
            line.trim().length > 0
        );
        const base64Data = payloadLines.join('').trim();
        const decodedJson = bytesToString(base64ToBytes(base64Data));
        parsed = JSON.parse(decodedJson);
      } catch {
        throw new Error('Failed to decrypt .btw-vault backup container. File may be corrupted.');
      }
    } else {
      // 2. Direct JSON or raw Base64 (supporting legacy exports)
      try {
        parsed = JSON.parse(content);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
      } catch {
        try {
          const decoded = bytesToString(base64ToBytes(content));
          parsed = JSON.parse(decoded);
        } catch {
          throw new Error('The selected file is not a valid .btw-vault or JSON backup document.');
        }
      }
    }

    const root = parsed.backup || parsed;
    const config = root.config;

    if (!config) {
      throw new Error('Invalid vault backup: missing configuration.');
    }

    if (!config.salt || !config.verification) {
      throw new Error('Invalid vault backup: missing configuration salt or verification block.');
    }

    // Version 2: SQLCipher snapshot
    if (root.version === 2 && root.dbSnapshotBase64) {
      return {
        version: 2,
        config,
        dbSnapshotBase64: root.dbSnapshotBase64,
        exportedAt: root.exportedAt || new Date().toISOString(),
      };
    }

    // Version 1 / legacy: Encrypted JSON payload
    const payload = root.payload;
    if (!payload || !payload.ciphertext || !payload.iv || !payload.tag) {
      throw new Error('Invalid vault backup: missing encrypted database snapshot or payload block.');
    }

    if (!payload.salt && config.salt) {
      payload.salt = config.salt;
    }
    if (!config.salt && payload.salt) {
      config.salt = payload.salt;
    }

    return {
      version: 1,
      config,
      payload,
      exportedAt: root.exportedAt || new Date().toISOString(),
    };
  }
}
