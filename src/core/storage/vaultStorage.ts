import { EncryptedPayload, VaultConfig } from '../../types';
import { AppFileSystem, EncodingType } from './fileSystemAdapter';
import { SqlCipherService } from './sqlCipherService';

const VAULT_FILE_NAME = 'vault.enc';
const CONFIG_FILE_NAME = 'vault_config.json';

const getVaultFilePath = () => `${AppFileSystem.getPaths().document.uri}/${VAULT_FILE_NAME}`;
const getConfigFilePath = () => `${AppFileSystem.getPaths().document.uri}/${CONFIG_FILE_NAME}`;

export class VaultStorage {
  /**
   * Check if vault configuration exists (initialized)
   */
  static async isVaultInitialized(): Promise<boolean> {
    try {
      const info = await AppFileSystem.getInfoAsync(getConfigFilePath());
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
    await AppFileSystem.writeAsStringAsync(getConfigFilePath(), jsonStr, {
      encoding: EncodingType.UTF8,
    });
  }

  /**
   * Load vault setup configuration
   */
  static async loadVaultConfig(): Promise<VaultConfig | null> {
    try {
      const path = getConfigFilePath();
      const info = await AppFileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await AppFileSystem.readAsStringAsync(path, {
        encoding: EncodingType.UTF8,
      });
      return JSON.parse(content) as VaultConfig;
    } catch {
      return null;
    }
  }

  /**
   * Write encrypted payload to local file storage (used for legacy format)
   */
  static async saveEncryptedVault(payload: EncryptedPayload): Promise<void> {
    const jsonStr = JSON.stringify(payload);
    await AppFileSystem.writeAsStringAsync(getVaultFilePath(), jsonStr, {
      encoding: EncodingType.UTF8,
    });
  }

  /**
   * Read encrypted payload from local file storage (used for legacy migration)
   */
  static async loadEncryptedVault(): Promise<EncryptedPayload | null> {
    try {
      const path = getVaultFilePath();
      const info = await AppFileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await AppFileSystem.readAsStringAsync(path, {
        encoding: EncodingType.UTF8,
      });
      if (!content.trim()) return null;

      return JSON.parse(content) as EncryptedPayload;
    } catch {
      return null;
    }
  }

  /**
   * Restore an encrypted SQLCipher database snapshot directly to the device
   */
  static async restoreEncryptedDbSnapshot(base64Data: string): Promise<void> {
    await SqlCipherService.wipeVaultDatabase();
    const dbPath = SqlCipherService.getDbFilePath();

    await AppFileSystem.writeAsStringAsync(dbPath, base64Data, {
      encoding: EncodingType.Base64,
    });
  }

  /**
   * Delete all local vault data (Wipe Vault)
   */
  static async wipeLocalVault(): Promise<void> {
    try {
      // 1. Wipe SQLCipher database files
      await SqlCipherService.wipeVaultDatabase();

      // 2. Wipe legacy vault and backup files
      const vaultPath = getVaultFilePath();
      const configPath = getConfigFilePath();
      const backupPath = `${AppFileSystem.getPaths().document.uri}/vault.enc.migrated_backup`;

      const files = [vaultPath, configPath, backupPath];
      for (const f of files) {
        try {
          const info = await AppFileSystem.getInfoAsync(f);
          if (info.exists) await AppFileSystem.deleteAsync(f);
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
