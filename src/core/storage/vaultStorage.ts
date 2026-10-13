import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { EncryptedPayload, VaultConfig } from '../../types';

const VAULT_FILE_NAME = 'vault.enc';
const CONFIG_FILE_NAME = 'vault_config.json';

const getVaultFilePath = () => `${Paths.document.uri}/${VAULT_FILE_NAME}`;
const getConfigFilePath = () => `${Paths.document.uri}/${CONFIG_FILE_NAME}`;

export class VaultStorage {
  /**
   * Check if vault configuration exists (initialized)
   */
  static async isVaultInitialized(): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(getConfigFilePath());
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Save vault setup configuration
   */
  static async saveVaultConfig(config: VaultConfig): Promise<void> {
    const jsonStr = JSON.stringify(config);
    await FileSystem.writeAsStringAsync(getConfigFilePath(), jsonStr, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  /**
   * Load vault setup configuration
   */
  static async loadVaultConfig(): Promise<VaultConfig | null> {
    try {
      const path = getConfigFilePath();
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return JSON.parse(content) as VaultConfig;
    } catch {
      return null;
    }
  }

  /**
   * Write encrypted payload to local file storage
   */
  static async saveEncryptedVault(payload: EncryptedPayload): Promise<void> {
    const jsonStr = JSON.stringify(payload);
    await FileSystem.writeAsStringAsync(getVaultFilePath(), jsonStr, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  /**
   * Read encrypted payload from local file storage
   */
  static async loadEncryptedVault(): Promise<EncryptedPayload | null> {
    try {
      const path = getVaultFilePath();
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (!content.trim()) return null;

      return JSON.parse(content) as EncryptedPayload;
    } catch {
      return null;
    }
  }

  /**
   * Delete all local vault data (Wipe Vault)
   */
  static async wipeLocalVault(): Promise<void> {
    try {
      const vaultPath = getVaultFilePath();
      const configPath = getConfigFilePath();

      const vInfo = await FileSystem.getInfoAsync(vaultPath);
      if (vInfo.exists) await FileSystem.deleteAsync(vaultPath);

      const cInfo = await FileSystem.getInfoAsync(configPath);
      if (cInfo.exists) await FileSystem.deleteAsync(configPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
