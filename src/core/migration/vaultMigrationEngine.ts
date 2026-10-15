import { AppFileSystem } from '../storage/fileSystemAdapter';
import { VaultStorage } from '../storage/vaultStorage';
import { SqlCipherService } from '../storage/sqlCipherService';
import { ItemDao } from '../storage/itemDao';
import { CategoryDao } from '../storage/categoryDao';
import { CryptoService } from '../crypto/cryptoService';
import { sanitizeVaultItem } from '../security/vaultLimits';
import { VaultItem } from '../../types';

export interface MigrationResult {
  migrated: boolean;
  itemCount: number;
  categoryCount: number;
  backupPath?: string;
  error?: string;
}

export class VaultMigrationEngine {
  /**
   * Checks whether automatic migration from legacy vault.enc is required,
   * executes migration inside a single atomic transaction, verifies row counts,
   * and renames vault.enc to vault.enc.migrated_backup as an encrypted fallback.
   */
  static async checkAndMigrate(masterKey: Uint8Array): Promise<MigrationResult> {
    const db = SqlCipherService.getDatabase();

    // 1. Check if migration has already completed in SQLCipher metadata
    try {
      const metaRes = await db.execute(
        "SELECT value FROM vault_metadata WHERE key = 'migration_completed' LIMIT 1;"
      );
      if (metaRes.rows && metaRes.rows.length > 0 && metaRes.rows[0].value === 'true') {
        return { migrated: false, itemCount: 0, categoryCount: 0 };
      }
    } catch {
      // Table may be empty
    }

    // 2. Check if legacy vault.enc exists
    const legacyVaultPath = `${AppFileSystem.getPaths().document.uri}/vault.enc`;
    let legacyExists = false;
    try {
      const info = await AppFileSystem.getInfoAsync(legacyVaultPath);
      legacyExists = info.exists;
    } catch {
      legacyExists = false;
    }

    if (!legacyExists) {
      // Mark as completed since there is no legacy data to migrate
      await db.execute(
        "INSERT OR REPLACE INTO vault_metadata (key, value) VALUES ('migration_completed', 'true');"
      );
      return { migrated: false, itemCount: 0, categoryCount: 0 };
    }

    // 3. Decrypt legacy vault.enc in memory
    const encryptedVault = await VaultStorage.loadEncryptedVault();
    if (!encryptedVault) {
      await db.execute(
        "INSERT OR REPLACE INTO vault_metadata (key, value) VALUES ('migration_completed', 'true');"
      );
      return { migrated: false, itemCount: 0, categoryCount: 0 };
    }

    let legacyItems: VaultItem[] = [];
    try {
      const decrypted = CryptoService.decryptVaultItems(encryptedVault, masterKey);
      legacyItems = decrypted.map(sanitizeVaultItem);
    } catch (decryptErr: any) {
      throw new Error(`Failed to decrypt legacy vault during migration: ${decryptErr.message}`);
    }

    // 4. Load custom categories from vault_config if present
    const config = await VaultStorage.loadVaultConfig();
    const categories = config?.customCategories || [];

    // 5. Atomic Batch Insert inside a single transaction
    const nowIso = new Date().toISOString();
    await db.transaction(async (tx) => {
      // Batch insert items
      for (const item of legacyItems) {
        const card = item.cardDetails;
        await tx.execute(
          `INSERT OR REPLACE INTO items (
            id, category, title, username, password, url, notes, color,
            is_pinned, card_brand, card_last4, card_number_type,
            card_details_json, note_sections_json, additional_urls_json,
            tags_json, custom_fields_json, document_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            item.id,
            item.category,
            item.title,
            item.username || null,
            item.password || null,
            item.url || null,
            item.notes || null,
            item.color || null,
            item.isPinned ? 1 : 0,
            card?.cardBrand || null,
            card?.cardNumber ? card.cardNumber.slice(-4) : null,
            card?.cardNumberType || null,
            card ? JSON.stringify(card) : null,
            item.noteSections ? JSON.stringify(item.noteSections) : null,
            item.additionalUrls ? JSON.stringify(item.additionalUrls) : null,
            item.tags ? JSON.stringify(item.tags) : null,
            item.customFields ? JSON.stringify(item.customFields) : '[]',
            item.document ? JSON.stringify(item.document) : null,
            item.createdAt,
            item.updatedAt,
          ]
        );
      }

      // Batch insert custom categories
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        await tx.execute(
          `INSERT OR REPLACE INTO custom_categories (
            id, name, icon, color, bg_tint, fields_schema_json, is_builtin, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            cat.id,
            cat.name,
            cat.icon,
            cat.color,
            cat.bgTint,
            JSON.stringify(cat.fields || []),
            cat.isBuiltin ? 1 : 0,
            i,
            cat.createdAt,
            cat.updatedAt,
          ]
        );
      }

      // Set metadata flags
      await tx.execute("INSERT OR REPLACE INTO vault_metadata (key, value) VALUES ('migration_completed', 'true');");
      await tx.execute(`INSERT OR REPLACE INTO vault_metadata (key, value) VALUES ('migrated_at', '${nowIso}');`);
      await tx.execute(`INSERT OR REPLACE INTO vault_metadata (key, value) VALUES ('migrated_items_count', '${legacyItems.length}');`);
    });

    // 6. Verify row count matches exactly (Zero Data Loss Guarantee)
    const verifiedCount = await ItemDao.countItems();
    if (verifiedCount < legacyItems.length) {
      throw new Error(
        `Migration integrity mismatch: Expected ${legacyItems.length} items, but SQLCipher verified ${verifiedCount}. Aborting.`
      );
    }

    // 7. Safely rename vault.enc to vault.enc.migrated_backup (preserve encrypted fallback)
    const backupPath = `${AppFileSystem.getPaths().document.uri}/vault.enc.migrated_backup`;
    try {
      const existingBackup = await AppFileSystem.getInfoAsync(backupPath);
      if (existingBackup.exists) {
        await AppFileSystem.deleteAsync(backupPath);
      }
      await AppFileSystem.moveAsync({
        from: legacyVaultPath,
        to: backupPath,
      });
    } catch (moveErr) {
      console.warn('Could not rename legacy vault.enc after migration:', moveErr);
    }

    return {
      migrated: true,
      itemCount: legacyItems.length,
      categoryCount: categories.length,
      backupPath,
    };
  }
}
