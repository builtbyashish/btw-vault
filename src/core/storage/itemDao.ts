import { VaultItem } from '../../types';
import { SqlCipherService } from './sqlCipherService';

export function rowToVaultItem(row: Record<string, any>): VaultItem {
  let cardDetails = undefined;
  if (row.card_details_json) {
    try {
      cardDetails = JSON.parse(row.card_details_json);
    } catch {
      // Ignored
    }
  }

  let noteSections = undefined;
  if (row.note_sections_json) {
    try {
      noteSections = JSON.parse(row.note_sections_json);
    } catch {
      // Ignored
    }
  }

  let additionalUrls = undefined;
  if (row.additional_urls_json) {
    try {
      additionalUrls = JSON.parse(row.additional_urls_json);
    } catch {
      // Ignored
    }
  }

  let tags = undefined;
  if (row.tags_json) {
    try {
      tags = JSON.parse(row.tags_json);
    } catch {
      // Ignored
    }
  }

  let customFields = [];
  if (row.custom_fields_json) {
    try {
      customFields = JSON.parse(row.custom_fields_json);
    } catch {
      customFields = [];
    }
  }

  let document = undefined;
  if (row.document_json) {
    try {
      document = JSON.parse(row.document_json);
    } catch {
      // Ignored
    }
  }

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    username: row.username || undefined,
    password: row.password || undefined,
    url: row.url || undefined,
    notes: row.notes || undefined,
    color: row.color || undefined,
    isPinned: Boolean(row.is_pinned),
    cardDetails,
    noteSections,
    additionalUrls,
    tags,
    customFields,
    document,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function vaultItemToRowParams(item: VaultItem): any[] {
  const card = item.cardDetails;
  return [
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
  ];
}

const INSERT_OR_REPLACE_SQL = `
  INSERT OR REPLACE INTO items (
    id, category, title, username, password, url, notes, color,
    is_pinned, card_brand, card_last4, card_number_type,
    card_details_json, note_sections_json, additional_urls_json,
    tags_json, custom_fields_json, document_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

export class ItemDao {
  /**
   * Fetch all vault items ordered by pinned status and updated_at descending
   */
  static async getAllItems(): Promise<VaultItem[]> {
    const db = SqlCipherService.getDatabase();
    const res = await db.execute(`
      SELECT * FROM items ORDER BY is_pinned DESC, updated_at DESC;
    `);
    return res.rows.map(rowToVaultItem);
  }

  /**
   * Fetch a single item by unique ID
   */
  static async getItemById(id: string): Promise<VaultItem | null> {
    const db = SqlCipherService.getDatabase();
    const res = await db.execute('SELECT * FROM items WHERE id = ? LIMIT 1;', [id]);
    if (!res.rows || res.rows.length === 0) return null;
    return rowToVaultItem(res.rows[0]);
  }

  /**
   * Insert or update a single vault item
   */
  static async insertItem(item: VaultItem): Promise<void> {
    const db = SqlCipherService.getDatabase();
    await db.execute(INSERT_OR_REPLACE_SQL, vaultItemToRowParams(item));
  }

  /**
   * Batch insert an array of vault items inside a single atomic transaction
   */
  static async insertItemsBatch(items: VaultItem[]): Promise<void> {
    if (items.length === 0) return;
    const db = SqlCipherService.getDatabase();

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.execute(INSERT_OR_REPLACE_SQL, vaultItemToRowParams(item));
      }
    });
  }

  /**
   * Update an existing vault item
   */
  static async updateItem(item: VaultItem): Promise<void> {
    await this.insertItem(item);
  }

  /**
   * Delete an item by unique ID
   */
  static async deleteItem(id: string): Promise<void> {
    const db = SqlCipherService.getDatabase();
    await db.execute('DELETE FROM items WHERE id = ?;', [id]);
  }

  /**
   * Toggle pinned state for an item
   */
  static async togglePin(id: string): Promise<boolean> {
    const db = SqlCipherService.getDatabase();
    const nowIso = new Date().toISOString();
    await db.execute(
      'UPDATE items SET is_pinned = 1 - is_pinned, updated_at = ? WHERE id = ?;',
      [nowIso, id]
    );
    const updated = await this.getItemById(id);
    return updated?.isPinned ?? false;
  }

  /**
   * Search items using FTS5 with fallback to SQL LIKE query
   */
  static async searchItems(query: string): Promise<VaultItem[]> {
    const db = SqlCipherService.getDatabase();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return this.getAllItems();
    }

    // 1. Try Full-Text Search (FTS5)
    try {
      // Escape FTS special chars and perform prefix match
      const sanitizedFts = cleanQuery.replace(/['"*^]/g, '').trim();
      if (sanitizedFts.length > 0) {
        const ftsQuery = `"${sanitizedFts}"*`;
        const ftsRes = await db.execute(
          `SELECT items.* FROM items 
           JOIN items_fts ON items.id = items_fts.id 
           WHERE items_fts MATCH ? 
           ORDER BY items.is_pinned DESC, items.updated_at DESC;`,
          [ftsQuery]
        );
        if (ftsRes.rows && ftsRes.rows.length > 0) {
          return ftsRes.rows.map(rowToVaultItem);
        }
      }
    } catch {
      // FTS5 failed or not available, gracefully fall back to LIKE query
    }

    // 2. Fallback LIKE query
    const likePattern = `%${cleanQuery}%`;
    const res = await db.execute(
      `SELECT * FROM items 
       WHERE title LIKE ? OR username LIKE ? OR url LIKE ? OR notes LIKE ? 
       ORDER BY is_pinned DESC, updated_at DESC;`,
      [likePattern, likePattern, likePattern, likePattern]
    );
    return res.rows.map(rowToVaultItem);
  }

  /**
   * Return total count of items in the vault
   */
  static async countItems(): Promise<number> {
    const db = SqlCipherService.getDatabase();
    const res = await db.execute('SELECT COUNT(*) as total FROM items;');
    return Number(res.rows[0]?.total || 0);
  }
}
