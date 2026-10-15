import { AppFileSystem } from './fileSystemAdapter';

export interface SqlQueryResult {
  rowsAffected: number;
  insertId?: number;
  rows: Array<Record<string, any>>;
}

export interface SqlBatchResult {
  rowsAffected?: number;
}

export interface ISqlDatabase {
  execute(query: string, params?: any[]): Promise<SqlQueryResult>;
  executeSync(query: string, params?: any[]): SqlQueryResult;
  executeBatch(commands: [string, any[]?][]): Promise<SqlBatchResult>;
  transaction(fn: (tx: { execute: (query: string, params?: any[]) => Promise<SqlQueryResult> }) => Promise<void>): Promise<void>;
  close(): Promise<void> | void;
  getDbPath(location?: string): string;
}

export const VAULT_DB_NAME = 'vault.db';

/**
 * Format 32-byte master key into SQLCipher raw hex format x'0123...def' (67 characters).
 * In SQLCipher, the x'...' syntax instructs the engine to load the 32 bytes directly
 * as a raw AES-256 key without running an extra PBKDF2 cycle.
 */
export function masterKeyToHexKey(masterKey: Uint8Array): string {
  const hex = Array.from(masterKey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `x'${hex}'`;
}

// Safely lazy-load op-sqlite without crashing in non-native / test environments
let opSqliteModule: typeof import('@op-engineering/op-sqlite') | null = null;
function getOpSqlite(): typeof import('@op-engineering/op-sqlite') | null {
  if (!opSqliteModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      opSqliteModule = require('@op-engineering/op-sqlite');
    } catch {
      opSqliteModule = null;
    }
  }
  return opSqliteModule;
}

export class SqlCipherService {
  private static activeDb: ISqlDatabase | null = null;
  private static testDbOverride: ISqlDatabase | null = null;

  /**
   * Allows injecting a mock / in-memory database for unit testing
   */
  static setTestDatabase(db: ISqlDatabase | null): void {
    this.testDbOverride = db;
    if (db) {
      this.activeDb = db;
    }
  }

  /**
   * Check if the vault database is currently open and decrypted in memory
   */
  static isVaultOpen(): boolean {
    return this.activeDb !== null;
  }

  /**
   * Retrieve the active decrypted database handle
   */
  static getDatabase(): ISqlDatabase {
    if (!this.activeDb) {
      throw new Error('Vault database is locked or uninitialized. Please unlock first.');
    }
    return this.activeDb;
  }

  /**
   * Open and decrypt the SQLCipher database using the Argon2id-derived master key
   */
  static async openVault(masterKey: Uint8Array): Promise<ISqlDatabase> {
    if (this.testDbOverride) {
      this.activeDb = this.testDbOverride;
      await this.initializePragmasAndSchema(this.activeDb);
      return this.activeDb;
    }

    const opSqlite = getOpSqlite();
    if (!opSqlite) {
      throw new Error('Native SQLCipher module (@op-engineering/op-sqlite) is not available on this platform.');
    }

    const encryptionKey = masterKeyToHexKey(masterKey);

    try {
      const db = opSqlite.open({
        name: VAULT_DB_NAME,
        encryptionKey,
      });

      const adapter: ISqlDatabase = {
        execute: async (query, params) => {
          const res = await db.execute(query, params);
          return {
            rowsAffected: res.rowsAffected,
            insertId: res.insertId,
            rows: (res.rows || []) as Array<Record<string, any>>,
          };
        },
        executeSync: (query, params) => {
          const res = db.executeSync(query, params);
          return {
            rowsAffected: res.rowsAffected,
            insertId: res.insertId,
            rows: (res.rows || []) as Array<Record<string, any>>,
          };
        },
        executeBatch: async (commands) => {
          const formatted = commands.map((c) => [c[0], c[1] || []] as [string, any[]]);
          const res = await db.executeBatch(formatted);
          return { rowsAffected: res.rowsAffected };
        },
        transaction: async (fn) => {
          await db.transaction(async (tx) => {
            await fn({
              execute: async (q, p) => {
                const r = await tx.execute(q, p);
                return {
                  rowsAffected: r.rowsAffected,
                  insertId: r.insertId,
                  rows: (r.rows || []) as Array<Record<string, any>>,
                };
              },
            });
          });
        },
        close: async () => {
          try {
            await db.closeAsync();
          } catch {
            db.close();
          }
        },
        getDbPath: (loc) => db.getDbPath(loc),
      };

      this.activeDb = adapter;
      await this.initializePragmasAndSchema(adapter);
      return adapter;
    } catch (e: any) {
      this.activeDb = null;
      throw new Error(`Failed to unlock SQLCipher database: ${e.message || 'Key mismatch or corrupted file'}`);
    }
  }

  /**
   * Applies budget phone PRAGMAs and creates tables and indexes
   */
  static async initializePragmasAndSchema(db: ISqlDatabase): Promise<void> {
    // 1. Budget Android Performance PRAGMAs
    // WAL mode: concurrent reads & writes without lock contention
    await db.execute('PRAGMA journal_mode = WAL;');
    // synchronous = NORMAL: safe against app crashes, removes fsync stalls on slow eMMC flash
    await db.execute('PRAGMA synchronous = NORMAL;');
    // page_size = 4096: matches OS & flash block architecture
    await db.execute('PRAGMA page_size = 4096;');
    // cache_size = -2048: caps SQLite RAM cache at exactly 2 MB to prevent OOM on 2GB RAM phones
    await db.execute('PRAGMA cache_size = -2048;');
    // temp_store = MEMORY: prevents flash wear and storage write amplification
    await db.execute('PRAGMA temp_store = MEMORY;');
    // auto_vacuum = INCREMENTAL: avoids stop-the-world compaction freezes
    await db.execute('PRAGMA auto_vacuum = INCREMENTAL;');

    // 2. Vault Metadata Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vault_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 3. Vault Items Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        username TEXT,
        password TEXT,
        url TEXT,
        notes TEXT,
        color TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        card_brand TEXT,
        card_last4 TEXT,
        card_number_type TEXT,
        card_details_json TEXT,
        note_sections_json TEXT,
        additional_urls_json TEXT,
        tags_json TEXT,
        custom_fields_json TEXT,
        document_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 4. Custom Categories Definition Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS custom_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        bg_tint TEXT NOT NULL,
        fields_schema_json TEXT NOT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 5. Composite Performance Indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_category_pinned_updated 
        ON items (category, is_pinned DESC, updated_at DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_pinned_updated 
        ON items (is_pinned DESC, updated_at DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_updated 
        ON items (updated_at DESC);
    `);

    // 6. Full-Text Search (FTS5) for Zero-Latency Instant Search (best-effort)
    try {
      await db.execute(`
        CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
          id UNINDEXED,
          title,
          username,
          url,
          notes,
          content=items,
          content_rowid=rowid
        );
      `);

      await db.execute(`
        CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
          INSERT INTO items_fts(rowid, id, title, username, url, notes)
          VALUES (new.rowid, new.id, new.title, new.username, new.url, new.notes);
        END;
      `);

      await db.execute(`
        CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
          INSERT INTO items_fts(items_fts, rowid, id, title, username, url, notes)
          VALUES ('delete', old.rowid, old.id, old.title, old.username, old.url, old.notes);
        END;
      `);

      await db.execute(`
        CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
          INSERT INTO items_fts(items_fts, rowid, id, title, username, url, notes)
          VALUES ('delete', old.rowid, old.id, old.title, old.username, old.url, old.notes);
          INSERT INTO items_fts(rowid, id, title, username, url, notes)
          VALUES (new.rowid, new.id, new.title, new.username, new.url, new.notes);
        END;
      `);
    } catch {
      // FTS5 optional: if not compiled in a specific test mock, standard queries will be used
    }
  }

  /**
   * Safely closes the database connection and wipes active handle from memory
   */
  static async closeVault(): Promise<void> {
    if (this.activeDb) {
      try {
        await this.activeDb.close();
      } catch {
        // Ignore close errors
      }
      this.activeDb = null;
    }
  }

  /**
   * Creates an atomic, standalone encrypted snapshot of the database using VACUUM INTO.
   * Runs PRAGMA wal_checkpoint(PASSIVE) first to flush recent writes without blocking.
   * The resulting file is completely standalone, encrypted with the same key, and has 0 lock contention.
   */
  static async createSnapshot(destinationFilePath: string): Promise<void> {
    const db = this.getDatabase();

    // Check if destination already exists and remove it (SQLite VACUUM INTO requires target not to exist)
    try {
      const info = await AppFileSystem.getInfoAsync(destinationFilePath);
      if (info.exists) {
        await AppFileSystem.deleteAsync(destinationFilePath);
      }
    } catch {
      // File does not exist or fs unavailable
    }

    // 1. Passive checkpoint to flush pages without blocking readers or writers
    await db.execute('PRAGMA wal_checkpoint(PASSIVE);');

    // 2. Atomic non-blocking VACUUM INTO
    const normalizedPath = destinationFilePath.replace(/^file:\/\//, '').replace(/'/g, "''");
    await db.execute(`VACUUM INTO '${normalizedPath}';`);
  }

  /**
   * Gets absolute path to the main database file
   */
  static getDbFilePath(): string {
    if (this.activeDb) {
      try {
        return this.activeDb.getDbPath();
      } catch {
        // Fallback
      }
    }
    return `${AppFileSystem.getPaths().document.uri}/${VAULT_DB_NAME}`;
  }

  /**
   * Deletes all local SQLCipher files (vault.db, vault.db-wal, vault.db-shm)
   */
  static async wipeVaultDatabase(): Promise<void> {
    await this.closeVault();

    const dbPath = this.getDbFilePath();
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    const pathsToDelete = [dbPath, walPath, shmPath];

    for (const p of pathsToDelete) {
      try {
        const info = await AppFileSystem.getInfoAsync(p);
        if (info.exists) {
          await AppFileSystem.deleteAsync(p);
        }
      } catch {
        // Ignore
      }
    }
  }
}
