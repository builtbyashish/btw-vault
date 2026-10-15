import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Database,
  Lock,
  ShieldCheck,
  FileCode,
  HardDrive,
  RefreshCw,
  Layers,
  Cpu,
  CheckCircle2,
  FolderLock,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { AppFileSystem } from '../../src/core/storage/fileSystemAdapter';
import { VaultStorage } from '../../src/core/storage/vaultStorage';
import { SqlCipherService } from '../../src/core/storage/sqlCipherService';
import { ItemDao } from '../../src/core/storage/itemDao';
import { CategoryDao } from '../../src/core/storage/categoryDao';
import { EncryptedPayload, VaultConfig } from '../../src/types';
import { AppHeader } from '../../src/components/AppHeader';

/**
 * Contracts long cryptographic strings into a secure abbreviated format
 * e.g. "Ab3d9F12...8xK2pL9q" so raw secrets cannot be extracted or misused.
 */
function contractHash(value: string | undefined | null, lead: number = 8, trail: number = 8): string {
  if (!value) return '—';
  if (value.length <= lead + trail + 3) return value;
  return `${value.slice(0, lead)}...${value.slice(-trail)}`;
}

export default function EncryptedDatabaseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<EncryptedPayload | null>(null);
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [vaultFileSize, setVaultFileSize] = useState<number>(0);
  const [sqlCipherFileSize, setSqlCipherFileSize] = useState<number>(0);
  const [walFileSize, setWalFileSize] = useState<number>(0);
  const [shmFileSize, setShmFileSize] = useState<number>(0);
  const [configFileSize, setConfigFileSize] = useState<number>(0);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [isDbOpen, setIsDbOpen] = useState<boolean>(false);

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const loadDatabaseData = async () => {
    setLoading(true);
    try {
      const p = await VaultStorage.loadEncryptedVault();
      const c = await VaultStorage.loadVaultConfig();
      setPayload(p);
      setConfig(c);

      const dbOpen = SqlCipherService.isVaultOpen();
      setIsDbOpen(dbOpen);

      if (dbOpen) {
        try {
          const items = await ItemDao.getAllItems();
          setItemCount(items.length);
          const cats = await CategoryDao.getAllCategories();
          setCategoryCount(cats.length);
        } catch {
          // Non-fatal if query fails during lock
        }
      }

      const paths = AppFileSystem.getPaths();
      const dbPath = `${paths.document.uri}/vault.db`;
      const walPath = `${paths.document.uri}/vault.db-wal`;
      const shmPath = `${paths.document.uri}/vault.db-shm`;
      const vaultPath = `${paths.document.uri}/vault.enc`;
      const configPath = `${paths.document.uri}/vault_config.json`;

      const dbInfo = await AppFileSystem.getInfoAsync(dbPath);
      if (dbInfo.exists && typeof dbInfo.size === 'number') {
        setSqlCipherFileSize(dbInfo.size);
      }

      const walInfo = await AppFileSystem.getInfoAsync(walPath);
      if (walInfo.exists && typeof walInfo.size === 'number') {
        setWalFileSize(walInfo.size);
      } else {
        setWalFileSize(0);
      }

      const shmInfo = await AppFileSystem.getInfoAsync(shmPath);
      if (shmInfo.exists && typeof shmInfo.size === 'number') {
        setShmFileSize(shmInfo.size);
      } else {
        setShmFileSize(0);
      }

      const vInfo = await AppFileSystem.getInfoAsync(vaultPath);
      if (vInfo.exists && typeof vInfo.size === 'number') {
        setVaultFileSize(vInfo.size);
      } else {
        setVaultFileSize(0);
      }

      const cInfo = await AppFileSystem.getInfoAsync(configPath);
      if (cInfo.exists && typeof cInfo.size === 'number') {
        setConfigFileSize(cInfo.size);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Encrypted Database" onBack={() => router.back()} />
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Reading SQLCipher database metrics...</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Zero-Knowledge SQLCipher Security Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerHeader}>
              <ShieldCheck color="#10B981" size={22} />
              <Text style={styles.bannerTitle}>SQLCipher Encrypted Engine</Text>
            </View>
            <Text style={styles.bannerText}>
              btw vault stores all credentials, notes, and custom categories inside a native C++ JSI SQLCipher database with full AES-256 page-level encryption. Raw keys and ciphertexts are contracted on-screen for security.
            </Text>
          </View>

          {/* Engine & Optimization Overview */}
          <Text style={styles.sectionHeader}>STORAGE ENGINE & HARDWARE TUNING</Text>
          <View style={styles.card}>
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Lock color="#3B82F6" size={16} />
                <Text style={styles.metricLabel}>Encryption Standard</Text>
              </View>
              <Text style={styles.metricValueHighlight}>AES-256 (SQLCipher C++ JSI)</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Cpu color="#10B981" size={16} />
                <Text style={styles.metricLabel}>Key Derivation (KDF)</Text>
              </View>
              <Text style={styles.metricValue}>Argon2id (4MB, 2 Iterations)</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Database color="#8B5CF6" size={16} />
                <Text style={styles.metricLabel}>Journaling Engine</Text>
              </View>
              <Text style={styles.metricValue}>WAL (Write-Ahead Logging)</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <HardDrive color="#F59E0B" size={16} />
                <Text style={styles.metricLabel}>Memory Cache Ceiling</Text>
              </View>
              <Text style={styles.metricValue}>2 MB RAM (-2048 pages)</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <CheckCircle2 color="#0284C7" size={16} />
                <Text style={styles.metricLabel}>Flash Wear Reduction</Text>
              </View>
              <Text style={styles.metricValue}>PRAGMA synchronous=NORMAL</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Layers color="#EC4899" size={16} />
                <Text style={styles.metricLabel}>Temp Query Storage</Text>
              </View>
              <Text style={styles.metricValue}>MEMORY (Zero Disk Writes)</Text>
            </View>
          </View>

          {/* Database Files On Disk */}
          <Text style={styles.sectionHeader}>FILES ON LOCAL DEVICE STORAGE</Text>
          <View style={styles.card}>
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Database color="#3B82F6" size={16} />
                <Text style={styles.metricLabel}>vault.db (Encrypted SQLite)</Text>
              </View>
              <Text style={styles.metricValue}>
                {sqlCipherFileSize > 0 ? `${sqlCipherFileSize.toLocaleString()} bytes` : 'Initialized'}
              </Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <RefreshCw color="#10B981" size={16} />
                <Text style={styles.metricLabel}>vault.db-wal (WAL Buffer)</Text>
              </View>
              <Text style={styles.metricValue}>
                {walFileSize > 0 ? `${walFileSize.toLocaleString()} bytes` : '0 bytes (Flushed)'}
              </Text>
            </View>
            <View style={styles.separator} />

            {shmFileSize > 0 && (
              <>
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <HardDrive color="#8B5CF6" size={16} />
                    <Text style={styles.metricLabel}>vault.db-shm (Shared Memory)</Text>
                  </View>
                  <Text style={styles.metricValue}>{`${shmFileSize.toLocaleString()} bytes`}</Text>
                </View>
                <View style={styles.separator} />
              </>
            )}

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <FileCode color="#F59E0B" size={16} />
                <Text style={styles.metricLabel}>vault_config.json (Salt & Token)</Text>
              </View>
              <Text style={styles.metricValue}>
                {configFileSize > 0 ? `${configFileSize.toLocaleString()} bytes` : '0 bytes'}
              </Text>
            </View>

            {vaultFileSize > 0 && (
              <>
                <View style={styles.separator} />
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <FolderLock color="#94A3B8" size={16} />
                    <Text style={styles.metricLabel}>vault.enc (Legacy Backup)</Text>
                  </View>
                  <Text style={styles.metricValue}>{`${vaultFileSize.toLocaleString()} bytes`}</Text>
                </View>
              </>
            )}
          </View>

          {/* Relational Tables Status */}
          <Text style={styles.sectionHeader}>TABLES & INDEX INTEGRITY</Text>
          <View style={styles.card}>
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Layers color="#3B82F6" size={16} />
                <Text style={styles.metricLabel}>items Table</Text>
              </View>
              <Text style={styles.metricValue}>
                {isDbOpen && itemCount !== null ? `${itemCount} encrypted rows` : isDbOpen ? 'Active' : 'Locked'}
              </Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Layers color="#10B981" size={16} />
                <Text style={styles.metricLabel}>custom_categories Table</Text>
              </View>
              <Text style={styles.metricValue}>
                {isDbOpen && categoryCount !== null ? `${categoryCount} schemas` : isDbOpen ? 'Active' : 'Locked'}
              </Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Layers color="#8B5CF6" size={16} />
                <Text style={styles.metricLabel}>Composite Index</Text>
              </View>
              <Text style={styles.metricValue}>idx_items_query</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <CheckCircle2 color="#0284C7" size={16} />
                <Text style={styles.metricLabel}>Full-Text Search Engine</Text>
              </View>
              <Text style={styles.metricValue}>FTS5 / LIKE Accelerated</Text>
            </View>
          </View>

          {/* Cryptographic Verification Parameters */}
          <Text style={styles.sectionHeader}>AUTHENTICATION METADATA (CONTRACTED)</Text>
          {config?.verification ? (
            <View style={styles.card}>
              <View style={styles.codeBlockHeader}>
                <View style={styles.labelRow}>
                  <Lock color="#64748B" size={13} style={{ marginRight: 6 }} />
                  <Text style={styles.fieldLabel}>ARGON2ID MASTER SALT</Text>
                </View>
                <Text style={styles.fieldSub}>Cryptographically random 32-byte salt (Contracted)</Text>
              </View>
              <View style={styles.codeBox}>
                <Text style={styles.monoCode}>{contractHash(config.salt, 10, 8)}</Text>
              </View>
              <View style={styles.separator} />

              <View style={styles.codeBlockHeader}>
                <View style={styles.labelRow}>
                  <Lock color="#64748B" size={13} style={{ marginRight: 6 }} />
                  <Text style={styles.fieldLabel}>VERIFICATION CIPHERTEXT TOKEN</Text>
                </View>
                <Text style={styles.fieldSub}>Authenticates candidate key on unlock without storing password</Text>
              </View>
              <View style={styles.codeBox}>
                <Text style={styles.monoCode}>{contractHash(config.verification.ciphertext, 10, 8)}</Text>
              </View>
              <View style={styles.separator} />

              <View style={styles.codeBlockHeader}>
                <View style={styles.labelRow}>
                  <Lock color="#64748B" size={13} style={{ marginRight: 6 }} />
                  <Text style={styles.fieldLabel}>AES-GCM VERIFICATION TAG</Text>
                </View>
                <Text style={styles.fieldSub}>16-byte cryptographic MAC tag (Contracted)</Text>
              </View>
              <View style={styles.codeBox}>
                <Text style={styles.monoCode}>{contractHash(config.verification.tag, 6, 6)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No cryptographic configuration found.</Text>
            </View>
          )}

          {/* Security Notice */}
          <View style={styles.noticeCard}>
            <Lock color="#64748B" size={16} style={{ marginTop: 2, marginRight: 10 }} />
            <Text style={styles.noticeText}>
              All raw cryptographic keys are derived in volatile memory and never written to flash storage. To create an armored, zero-locking database snapshot, visit Settings → Export Backup.
            </Text>
          </View>

          {/* Reload Button */}
          <TouchableOpacity
            style={styles.reloadBtn}
            onPress={loadDatabaseData}
            activeOpacity={0.7}
          >
            <RefreshCw color="#64748B" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.reloadBtnText}>Refresh Database Inspector</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 8,
    marginTop: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  metricValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  codeBlockHeader: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  fieldSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  codeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  monoCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 12,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  reloadBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
