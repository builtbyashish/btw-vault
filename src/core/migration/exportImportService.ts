import { Platform } from 'react-native';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EncryptedPayload, VaultConfig } from '../../types';
import { VaultStorage } from '../storage/vaultStorage';
import {
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  bytesToString,
} from '../crypto/cryptoService';
import { AppSecurityService } from '../security/appSecurityService';

export interface ExportBackupData {
  version: 1;
  config: VaultConfig;
  payload: EncryptedPayload;
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

export class ExportImportService {
  /**
   * Clear remembered export directory URI
   */
  static async resetExportDirectory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EXPORT_DIR_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  /**
   * Get remembered export directory URI
   */
  static async getSavedExportDirectory(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(EXPORT_DIR_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Export encrypted vault backup file (.vault) directly to device storage
   */
  static async exportBackup(): Promise<ExportResult> {
    try {
      const config = await VaultStorage.loadVaultConfig();
      const payload = await VaultStorage.loadEncryptedVault();

      if (!config || !payload) {
        throw new Error('No vault data found to export');
      }

      const backupData: ExportBackupData = {
        version: 1,
        config,
        payload,
        exportedAt: new Date().toISOString(),
      };

      const rawJson = JSON.stringify(backupData);
      const base64Armored = bytesToBase64(stringToBytes(rawJson));
      const fileContent = `${VAULT_ARMOR_HEADER}\n${base64Armored}\n${VAULT_ARMOR_FOOTER}`;

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const fileName = `export_${dateStr}_${timeStr}.btw-vault`;

      // 1. Android: Save directly to device storage via SAF
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework?.createFileAsync) {
        try {
          // Check if we previously remembered a granted directory URI
          let savedDirUri = await AsyncStorage.getItem(EXPORT_DIR_STORAGE_KEY);

          if (savedDirUri) {
            try {
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                savedDirUri,
                fileName,
                'application/octet-stream'
              );

              await FileSystem.writeAsStringAsync(fileUri, fileContent, {
                encoding: FileSystem.EncodingType.UTF8,
              });

              return { success: true, fileName, destination: 'Device' };
            } catch (savedWriteErr) {
              console.warn('Cached export directory URI invalid or revoked, clearing:', savedWriteErr);
              await AsyncStorage.removeItem(EXPORT_DIR_STORAGE_KEY);
              savedDirUri = null;
            }
          }

          // First-time: Pre-target "Documents" instead of root "Download"
          // This avoids the Android 11+ "Can't use this folder" privacy block on root Download
          if (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync) {
            const initialSafUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Documents');
            AppSecurityService.setSystemActivityActive(true);
            let permissions;
            try {
              permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
                initialSafUri
              );
            } finally {
              AppSecurityService.setSystemActivityActive(false);
            }

            if (!permissions.granted) {
              return { success: false, canceled: true };
            }

            // Remember granted directory permanently so future exports save automatically
            await AsyncStorage.setItem(EXPORT_DIR_STORAGE_KEY, permissions.directoryUri);

            const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/octet-stream'
            );

            await FileSystem.writeAsStringAsync(fileUri, fileContent, {
              encoding: FileSystem.EncodingType.UTF8,
            });

            return { success: true, fileName, destination: 'Device' };
          }
        } catch (safError) {
          console.warn('StorageAccessFramework failed:', safError);
        }
      }

      // 2. iOS / Fallback: Write file and open sheet with "Save to Files" option
      const cacheDir = Paths.cache.uri.replace(/\/+$/, '');
      const tempUri = `${cacheDir}/${fileName}`;
      await FileSystem.writeAsStringAsync(tempUri, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        AppSecurityService.setSystemActivityActive(true);
        try {
          await Sharing.shareAsync(tempUri, {
            mimeType: 'application/octet-stream',
            dialogTitle: 'Save Vault Backup (.btw-vault)',
            UTI: 'public.data',
          });
        } finally {
          AppSecurityService.setSystemActivityActive(false);
        }
        return { success: true, fileName, destination: 'Device' };
      }

      return { success: false };
    } catch (e) {
      console.error('Export error:', e);
      throw e;
    }
  }

  /**
   * Import encrypted vault backup file (.vault or legacy .json)
   */
  static async importBackup(): Promise<ExportBackupData> {
    try {
      AppSecurityService.setSystemActivityActive(true);
      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          type: ['*/*', 'application/octet-stream', 'application/json', 'text/plain'],
          copyToCacheDirectory: true,
        });
      } finally {
        AppSecurityService.setSystemActivityActive(false);
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        throw new Error('Import canceled');
      }

      const fileUri = result.assets[0].uri;
      let rawContent = '';

      try {
        rawContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch {
        // Fallback for Android content:// or sandbox URIs
        try {
          const res = await fetch(fileUri);
          rawContent = await res.text();
        } catch {
          throw new Error('Could not read the selected backup file from device storage.');
        }
      }

      const content = rawContent.trim();
      if (!content) {
        throw new Error('The selected backup file is empty.');
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
            // Attempt raw base64 decode
            const decoded = bytesToString(base64ToBytes(content));
            parsed = JSON.parse(decoded);
          } catch {
            throw new Error('The selected file is not a valid .btw-vault or JSON backup document.');
          }
        }
      }

      const root = parsed.backup || parsed;
      const config = root.config;
      const payload = root.payload;

      if (!config || !payload) {
        throw new Error('Invalid vault backup: missing configuration or encrypted payload.');
      }

      if (!config.salt || !config.verification) {
        throw new Error('Invalid vault backup: missing configuration salt or verification block.');
      }

      if (!payload.ciphertext || !payload.iv || !payload.tag) {
        throw new Error('Invalid vault backup: missing encrypted ciphertext, IV, or auth tag.');
      }

      // Ensure salt is available
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
    } catch (e) {
      console.error('Import error:', e);
      throw e;
    }
  }
}
