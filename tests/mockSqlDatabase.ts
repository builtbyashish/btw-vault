import { ISqlDatabase, SqlQueryResult, SqlBatchResult } from '../src/core/storage/sqlCipherService';

export class MockSqlDatabase implements ISqlDatabase {
  public tables: Map<string, Map<string, Record<string, any>>> = new Map();
  public metadata: Map<string, string> = new Map();
  public executedQueries: { query: string; params?: any[] }[] = [];
  public isClosed: boolean = false;
  public pragmaValues: Map<string, string> = new Map();

  constructor() {
    this.tables.set('items', new Map());
    this.tables.set('custom_categories', new Map());
    this.tables.set('vault_metadata', new Map());
  }

  getDbPath(_location?: string): string {
    return '/mock/path/vault.db';
  }

  async execute(query: string, params?: any[]): Promise<SqlQueryResult> {
    this.executedQueries.push({ query, params });
    const trimmed = query.trim();

    // 1. PRAGMA
    if (trimmed.toUpperCase().startsWith('PRAGMA')) {
      const match = trimmed.match(/PRAGMA\s+([a-zA-Z0-9_]+)(?:\s*=\s*([a-zA-Z0-9_-]+))?/i);
      if (match) {
        const pragmaName = match[1].toLowerCase();
        const pragmaVal = match[2];
        if (pragmaVal !== undefined) {
          this.pragmaValues.set(pragmaName, pragmaVal);
          return { rowsAffected: 0, rows: [] };
        } else {
          const val = this.pragmaValues.get(pragmaName) || '';
          return { rowsAffected: 0, rows: [{ [pragmaName]: val }] };
        }
      }
      return { rowsAffected: 0, rows: [] };
    }

    // 2. CREATE TABLE / CREATE INDEX / CREATE TRIGGER / CREATE VIRTUAL TABLE
    if (
      trimmed.toUpperCase().startsWith('CREATE TABLE') ||
      trimmed.toUpperCase().startsWith('CREATE INDEX') ||
      trimmed.toUpperCase().startsWith('CREATE TRIGGER') ||
      trimmed.toUpperCase().startsWith('CREATE VIRTUAL TABLE')
    ) {
      const match = trimmed.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)/i);
      if (match) {
        const tbl = match[1].toLowerCase();
        if (!this.tables.has(tbl)) {
          this.tables.set(tbl, new Map());
        }
      }
      return { rowsAffected: 0, rows: [] };
    }

    // 3. VACUUM INTO
    if (trimmed.toUpperCase().startsWith('VACUUM INTO')) {
      return { rowsAffected: 0, rows: [] };
    }

    // 4. INSERT OR REPLACE INTO items
    if (trimmed.toUpperCase().startsWith('INSERT OR REPLACE INTO ITEMS')) {
      const p = params || [];
      const itemRow: Record<string, any> = {
        id: p[0],
        category: p[1],
        title: p[2],
        username: p[3],
        password: p[4],
        url: p[5],
        notes: p[6],
        color: p[7],
        is_pinned: p[8],
        card_brand: p[9],
        card_last4: p[10],
        card_number_type: p[11],
        card_details_json: p[12],
        note_sections_json: p[13],
        additional_urls_json: p[14],
        tags_json: p[15],
        custom_fields_json: p[16],
        document_json: p[17],
        created_at: p[18],
        updated_at: p[19],
      };
      this.tables.get('items')!.set(itemRow.id, itemRow);
      return { rowsAffected: 1, insertId: 1, rows: [] };
    }

    // 5. INSERT OR REPLACE INTO custom_categories
    if (trimmed.toUpperCase().startsWith('INSERT OR REPLACE INTO CUSTOM_CATEGORIES')) {
      const p = params || [];
      const catRow: Record<string, any> = {
        id: p[0],
        name: p[1],
        icon: p[2],
        color: p[3],
        bg_tint: p[4],
        fields_schema_json: p[5],
        is_builtin: p[6],
        sort_order: p[7],
        created_at: p[8],
        updated_at: p[9],
      };
      this.tables.get('custom_categories')!.set(catRow.id, catRow);
      return { rowsAffected: 1, insertId: 1, rows: [] };
    }

    // 6. INSERT OR REPLACE INTO vault_metadata
    if (trimmed.toUpperCase().startsWith('INSERT OR REPLACE INTO VAULT_METADATA')) {
      if (params && params.length >= 2) {
        this.metadata.set(params[0], params[1]);
      } else {
        const valMatch = trimmed.match(/VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/i);
        if (valMatch) {
          this.metadata.set(valMatch[1], valMatch[2]);
        }
      }
      return { rowsAffected: 1, rows: [] };
    }

    // 7. SELECT FROM vault_metadata
    if (trimmed.toUpperCase().startsWith('SELECT VALUE FROM VAULT_METADATA')) {
      const key = params?.[0] || trimmed.match(/key\s*=\s*'([^']+)'/i)?.[1];
      if (key && this.metadata.has(key)) {
        return { rowsAffected: 0, rows: [{ value: this.metadata.get(key)! }] };
      }
      return { rowsAffected: 0, rows: [] };
    }

    // 8. SELECT COUNT(*) FROM items
    if (trimmed.toUpperCase().includes('COUNT(*) AS TOTAL FROM ITEMS') || trimmed.toUpperCase().includes('COUNT(*) FROM ITEMS')) {
      const count = this.tables.get('items')!.size;
      return { rowsAffected: 0, rows: [{ total: count, count }] };
    }

    // 9. SELECT COUNT(*) FROM custom_categories
    if (trimmed.toUpperCase().includes('COUNT(*) AS TOTAL FROM CUSTOM_CATEGORIES')) {
      const count = this.tables.get('custom_categories')!.size;
      return { rowsAffected: 0, rows: [{ total: count, count }] };
    }

    // 10. SELECT * FROM items WHERE id = ?
    if (trimmed.toUpperCase().startsWith('SELECT * FROM ITEMS WHERE ID = ?')) {
      const id = params?.[0];
      const item = this.tables.get('items')!.get(id);
      return { rowsAffected: 0, rows: item ? [{ ...item }] : [] };
    }

    // 11. SELECT * FROM items (with optional order by)
    if (trimmed.toUpperCase().startsWith('SELECT * FROM ITEMS') && !trimmed.toUpperCase().includes('WHERE')) {
      const allItems = Array.from(this.tables.get('items')!.values()).map((it) => ({ ...it }));
      // Sort: is_pinned DESC, updated_at DESC
      allItems.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return b.is_pinned - a.is_pinned;
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      return { rowsAffected: 0, rows: allItems };
    }

    // 12. Search / FTS5 / LIKE
    if (trimmed.toUpperCase().includes('ITEMS_FTS MATCH') || trimmed.toUpperCase().includes('WHERE TITLE LIKE')) {
      const queryStr = (params?.[0] || '').replace(/[%*"]/g, '').toLowerCase();
      const matched = Array.from(this.tables.get('items')!.values()).filter((item) => {
        const title = (item.title || '').toLowerCase();
        const username = (item.username || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        return (
          title.includes(queryStr) ||
          username.includes(queryStr) ||
          url.includes(queryStr) ||
          notes.includes(queryStr)
        );
      });
      matched.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      return { rowsAffected: 0, rows: matched.map((it) => ({ ...it })) };
    }

    // 13. SELECT * FROM custom_categories WHERE id = ?
    if (trimmed.toUpperCase().startsWith('SELECT * FROM CUSTOM_CATEGORIES WHERE ID = ?')) {
      const id = params?.[0];
      const cat = this.tables.get('custom_categories')!.get(id);
      return { rowsAffected: 0, rows: cat ? [{ ...cat }] : [] };
    }

    // 14. SELECT * FROM custom_categories
    if (trimmed.toUpperCase().startsWith('SELECT * FROM CUSTOM_CATEGORIES')) {
      const allCats = Array.from(this.tables.get('custom_categories')!.values()).map((c) => ({ ...c }));
      allCats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return { rowsAffected: 0, rows: allCats };
    }

    // 15. DELETE FROM items WHERE id = ?
    if (trimmed.toUpperCase().startsWith('DELETE FROM ITEMS WHERE ID = ?')) {
      const id = params?.[0];
      const existed = this.tables.get('items')!.delete(id);
      return { rowsAffected: existed ? 1 : 0, rows: [] };
    }

    // 16. DELETE FROM custom_categories WHERE id = ?
    if (trimmed.toUpperCase().startsWith('DELETE FROM CUSTOM_CATEGORIES WHERE ID = ?')) {
      const id = params?.[0];
      const existed = this.tables.get('custom_categories')!.delete(id);
      return { rowsAffected: existed ? 1 : 0, rows: [] };
    }

    // 17. UPDATE items SET is_pinned = 1 - is_pinned, updated_at = ? WHERE id = ?
    if (trimmed.toUpperCase().includes('UPDATE ITEMS SET IS_PINNED = 1 - IS_PINNED')) {
      const updatedAt = params?.[0] || new Date().toISOString();
      const id = params?.[1];
      const item = this.tables.get('items')!.get(id);
      if (item) {
        item.is_pinned = item.is_pinned === 1 ? 0 : 1;
        item.updated_at = updatedAt;
        return { rowsAffected: 1, rows: [] };
      }
      return { rowsAffected: 0, rows: [] };
    }

    // 18. UPDATE items SET category = 'other' WHERE category = ?
    if (trimmed.toUpperCase().includes("UPDATE ITEMS SET CATEGORY = 'OTHER'")) {
      const updatedAt = params?.[0] || new Date().toISOString();
      const catId = params?.[1];
      let count = 0;
      for (const item of this.tables.get('items')!.values()) {
        if (item.category === catId) {
          item.category = 'other';
          item.updated_at = updatedAt;
          count++;
        }
      }
      return { rowsAffected: count, rows: [] };
    }

    return { rowsAffected: 0, rows: [] };
  }

  executeSync(query: string, params?: any[]): SqlQueryResult {
    let result: SqlQueryResult = { rowsAffected: 0, rows: [] };
    this.execute(query, params).then((res) => {
      result = res;
    });
    return result;
  }

  async executeBatch(commands: [string, any[]?][]): Promise<SqlBatchResult> {
    let total = 0;
    for (const [q, p] of commands) {
      const r = await this.execute(q, p);
      total += r.rowsAffected;
    }
    return { rowsAffected: total };
  }

  async transaction(
    fn: (tx: { execute: (query: string, params?: any[]) => Promise<SqlQueryResult> }) => Promise<void>
  ): Promise<void> {
    await fn({
      execute: (q, p) => this.execute(q, p),
    });
  }

  close(): void {
    this.isClosed = true;
  }
}
