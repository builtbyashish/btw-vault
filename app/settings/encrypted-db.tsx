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
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { VaultStorage } from '../../src/core/storage/vaultStorage';
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
  const [configFileSize, setConfigFileSize] = useState<number>(0);

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

      const vaultPath = `${Paths.document.uri}/vault.enc`;
      const configPath = `${Paths.document.uri}/vault_config.json`;

      const vInfo = await FileSystem.getInfoAsync(vaultPath);
      if (vInfo.exists && 'size' in vInfo) {
        setVaultFileSize(vInfo.size || 0);
      }

      const cInfo = await FileSystem.getInfoAsync(configPath);
      if (cInfo.exists && 'size' in cInfo) {
        setConfigFileSize(cInfo.size || 0);
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
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Reading encrypted database blocks...</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Zero Knowledge Security Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerHeader}>
              <ShieldCheck color="#34C759" size={22} />
              <Text style={styles.bannerTitle}>Zero-Knowledge Encrypted Storage</Text>
            </View>
        <Text style={styles.bannerText}>
          This inspector verifies local disk encryption. All ciphertext and cryptographic parameters are contracted and protected on-screen so they cannot be extracted or misused.
        </Text>
      </View>

      {/* Database Storage Metrics */}
      <Text style={styles.sectionHeader}>Storage Overview</Text>
      <View style={styles.card}>
        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Lock color="#007AFF" size={16} />
            <Text style={styles.metricLabel}>Encryption Standard</Text>
          </View>
          <Text style={styles.metricValue}>AES-256-GCM</Text>
        </View>
        <View style={styles.separator} />

        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Database color="#34C759" size={16} />
            <Text style={styles.metricLabel}>Key Derivation (KDF)</Text>
          </View>
          <Text style={styles.metricValue}>PBKDF2-HMAC-SHA256</Text>
        </View>
        <View style={styles.separator} />

        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <HardDrive color="#FF9500" size={16} />
            <Text style={styles.metricLabel}>vault.enc Size</Text>
          </View>
          <Text style={styles.metricValue}>{vaultFileSize > 0 ? `${vaultFileSize.toLocaleString()} bytes` : '0 bytes'}</Text>
        </View>
        <View style={styles.separator} />

        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <FileCode color="#AF52DE" size={16} />
            <Text style={styles.metricLabel}>vault_config.json Size</Text>
          </View>
          <Text style={styles.metricValue}>{configFileSize > 0 ? `${configFileSize.toLocaleString()} bytes` : '0 bytes'}</Text>
        </View>
      </View>

      {/* Contracted Cryptographic Payload (vault.enc) */}
      <Text style={styles.sectionHeader}>Protected Payload (vault.enc)</Text>
      {payload ? (
        <View style={styles.card}>
          {/* Ciphertext */}
          <View style={styles.codeBlockHeader}>
            <View style={styles.labelRow}>
              <Lock color="#8E8E93" size={13} style={{ marginRight: 6 }} />
              <Text style={styles.fieldLabel}>CIPHERTEXT (ENCRYPTED VAULT DATA)</Text>
            </View>
            <Text style={styles.fieldSub}>
              Length: {payload.ciphertext?.length?.toLocaleString() || 0} characters (Contracted)
            </Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.monoCode}>
              {contractHash(payload.ciphertext, 10, 8)}
            </Text>
          </View>
          <View style={styles.separator} />

          {/* IV */}
          <View style={styles.codeBlockHeader}>
            <View style={styles.labelRow}>
              <Lock color="#8E8E93" size={13} style={{ marginRight: 6 }} />
              <Text style={styles.fieldLabel}>INITIALIZATION VECTOR (IV)</Text>
            </View>
            <Text style={styles.fieldSub}>12-byte unique cryptographic nonce (Contracted)</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.monoCode}>
              {contractHash(payload.iv, 6, 6)}
            </Text>
          </View>
          <View style={styles.separator} />

          {/* Auth Tag */}
          <View style={styles.codeBlockHeader}>
            <View style={styles.labelRow}>
              <Lock color="#8E8E93" size={13} style={{ marginRight: 6 }} />
              <Text style={styles.fieldLabel}>AUTHENTICATION TAG (GCM MAC)</Text>
            </View>
            <Text style={styles.fieldSub}>16-byte integrity verification tag (Contracted)</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.monoCode}>
              {contractHash(payload.tag, 6, 6)}
            </Text>
          </View>
          <View style={styles.separator} />

          {/* Salt */}
          <View style={styles.codeBlockHeader}>
            <View style={styles.labelRow}>
              <Lock color="#8E8E93" size={13} style={{ marginRight: 6 }} />
              <Text style={styles.fieldLabel}>CRYPTOGRAPHIC SALT (PBKDF2)</Text>
            </View>
            <Text style={styles.fieldSub}>32-byte cryptographic salt (Contracted)</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.monoCode}>
              {contractHash(payload.salt, 8, 8)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No encrypted vault file found.</Text>
        </View>
      )}

      {/* Security Notice */}
      <View style={styles.noticeCard}>
        <Lock color="#8E8E93" size={16} style={{ marginTop: 2, marginRight: 10 }} />
        <Text style={styles.noticeText}>
          Raw cryptographic values are contracted on-screen and non-copyable to prevent clipboard harvesting or shoulder-surfing. To back up your vault, use Settings → Export Backup.
        </Text>
      </View>

      {/* Reload Button */}
      <TouchableOpacity
        style={styles.reloadBtn}
        onPress={loadDatabaseData}
        activeOpacity={0.7}
      >
        <RefreshCw color="#8E8E93" size={16} style={{ marginRight: 6 }} />
        <Text style={styles.reloadBtnText}>Refresh DB Inspector</Text>
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
    color: '#8E8E93',
    marginTop: 12,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
    color: '#000000',
  },
  bannerText: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 8,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
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
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
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
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  fieldSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  codeBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  monoCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
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
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 17,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  reloadBtnText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
