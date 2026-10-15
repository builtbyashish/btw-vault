import { CustomCategoryDefinition } from '../../types';
import { SqlCipherService } from './sqlCipherService';

export function rowToCategory(row: Record<string, any>): CustomCategoryDefinition {
  let fields = [];
  if (row.fields_schema_json) {
    try {
      fields = JSON.parse(row.fields_schema_json);
    } catch {
      fields = [];
    }
  }

  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    bgTint: row.bg_tint,
    fields,
    isBuiltin: Boolean(row.is_builtin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function categoryToRowParams(cat: CustomCategoryDefinition, sortOrder: number = 0): any[] {
  return [
    cat.id,
    cat.name,
    cat.icon,
    cat.color,
    cat.bgTint,
    JSON.stringify(cat.fields || []),
    cat.isBuiltin ? 1 : 0,
    sortOrder,
    cat.createdAt,
    cat.updatedAt,
  ];
}

const INSERT_OR_REPLACE_CAT_SQL = `
  INSERT OR REPLACE INTO custom_categories (
    id, name, icon, color, bg_tint, fields_schema_json, is_builtin, sort_order, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

export class CategoryDao {
  /**
   * Fetch all custom category definitions
   */
  static async getAllCategories(): Promise<CustomCategoryDefinition[]> {
    const db = SqlCipherService.getDatabase();
    const res = await db.execute(`
      SELECT * FROM custom_categories ORDER BY sort_order ASC, created_at ASC;
    `);
    return res.rows.map(rowToCategory);
  }

  /**
   * Fetch single category by ID
   */
  static async getCategoryById(id: string): Promise<CustomCategoryDefinition | null> {
    const db = SqlCipherService.getDatabase();
    const res = await db.execute('SELECT * FROM custom_categories WHERE id = ? LIMIT 1;', [id]);
    if (!res.rows || res.rows.length === 0) return null;
    return rowToCategory(res.rows[0]);
  }

  /**
   * Insert or update a category definition
   */
  static async insertCategory(cat: CustomCategoryDefinition, sortOrder: number = 0): Promise<void> {
    const db = SqlCipherService.getDatabase();
    await db.execute(INSERT_OR_REPLACE_CAT_SQL, categoryToRowParams(cat, sortOrder));
  }

  /**
   * Batch insert an array of categories inside a transaction
   */
  static async insertCategoriesBatch(cats: CustomCategoryDefinition[]): Promise<void> {
    if (cats.length === 0) return;
    const db = SqlCipherService.getDatabase();

    await db.transaction(async (tx) => {
      for (let i = 0; i < cats.length; i++) {
        await tx.execute(INSERT_OR_REPLACE_CAT_SQL, categoryToRowParams(cats[i], i));
      }
    });
  }

  /**
   * Update a category definition
   */
  static async updateCategory(cat: CustomCategoryDefinition): Promise<void> {
    await this.insertCategory(cat);
  }

  /**
   * Delete a category and re-assign any affected items to 'other'
   */
  static async deleteCategory(id: string): Promise<void> {
    const db = SqlCipherService.getDatabase();
    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      // 1. Delete category definition
      await tx.execute('DELETE FROM custom_categories WHERE id = ?;', [id]);

      // 2. Re-assign orphaned items to 'other'
      await tx.execute(
        "UPDATE items SET category = 'other', updated_at = ? WHERE category = ?;",
        [nowIso, id]
      );
    });
  }

  /**
   * Total number of custom categories
   */
  static async countCategories(): Promise<number> {
    const db = SqlCipherService.getDatabase();
    const res = await db.execute('SELECT COUNT(*) as total FROM custom_categories;');
    return Number(res.rows[0]?.total || 0);
  }
}
