import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Lock,
  ShieldCheck,
  Cloud,
  UploadCloud,
  RefreshCw,
  LogOut,
  CheckCircle2,
} from 'lucide-react-native';
import { useVault } from '../../src/context/VaultContext';
import { BiometricService } from '../../src/core/security/biometricService';
import { ExportImportService } from '../../src/core/migration/exportImportService';
import {
  GoogleDriveBackupService,
  CloudBackupStatus,
} from '../../src/core/cloud/googleDriveBackupService';
import { HapticService } from '../../src/core/haptics';
import { useSensitiveAuth } from '../../src/components/SensitiveAuthModal';
import { WipeVaultModal } from '../../src/components/WipeVaultModal';
import { CloudBackupModal, BackupModalType } from '../../src/components/CloudBackupModal';

export default function SettingsScreen() {
  const {
    biometricEnabled,
    toggleBiometric,
    autoLockMinutes,
    setAutoLockMinutes,
    lockVault,
    wipeVault,
    importVaultBackup,
  } = useVault();
  const { requireAuth, AuthModal } = useSensitiveAuth();
  const router = useRouter();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudBackupStatus>({
    isConfigured: false,
    isConnected: false,
    account: null,
    lastBackupTime: null,
    lastBackupSize: null,
    autoSync: 'on_change',
    networkPref: 'any',
  });
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [cloudModalType, setCloudModalType] = useState<BackupModalType | null>(null);

  useEffect(() => {
    checkBiometrics();
    loadCloudStatus();
  }, []);

  const loadCloudStatus = async () => {
    try {
      const status = await GoogleDriveBackupService.getStatus();
      setCloudStatus(status);
      if (status.isConnected) {
        GoogleDriveBackupService.fetchBackupMetadata()
          .then(async () => {
            const updated = await GoogleDriveBackupService.getStatus();
            setCloudStatus(updated);
          })
          .catch(() => {});
      }
    } catch {}
  };

  const formatBackupTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleConnectGoogleDrive = async (): Promise<boolean> => {
    if (!cloudStatus.isConfigured) {
      Alert.alert(
        'Google Client ID Not Set',
        'Please ensure EXPO_PUBLIC_GOOGLE_CLIENT_ID is configured in your .env file.'
      );
      return false;
    }
    setIsCloudLoading(true);
    try {
      await GoogleDriveBackupService.authenticate();
      const status = await GoogleDriveBackupService.getStatus();
      setCloudStatus(status);
      await HapticService.success();
      try {
        await GoogleDriveBackupService.fetchBackupMetadata();
        const updated = await GoogleDriveBackupService.getStatus();
        setCloudStatus(updated);
      } catch {}
      return true;
    } catch (e: any) {
      if (!e.message?.includes('canceled') && !e.message?.includes('dismissed')) {
        await HapticService.warning();
        Alert.alert('Google Sign-In Failed', e.message || 'Could not connect Google Drive.');
      }
      return false;
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleGoogleAccountPress = () => {
    if (!cloudStatus.isConnected) {
      setCloudModalType('link_prompt');
      return;
    }
    setCloudModalType('account_options');
  };

  const handleDisconnectGoogleDrive = async () => {
    await GoogleDriveBackupService.disconnect();
    const status = await GoogleDriveBackupService.getStatus();
    setCloudStatus(status);
    await HapticService.selection();
  };

  const handleSyncFrequencyPress = () => {
    setCloudModalType('sync_frequency');
  };

  const handleNetworkPrefPress = () => {
    setCloudModalType('network_pref');
  };

  const handleBackUpPress = async () => {
    if (!cloudStatus.isConnected) {
      setCloudModalType('link_prompt');
      return;
    }
    await performCloudBackup();
  };

  const performCloudBackup = async () => {
    const isAuthorized = await requireAuth(
      'Enter your master password to create an encrypted Google Drive backup.',
      {
        title: 'Confirm Master Password',
        confirmButtonText: 'Verify & Back Up',
        allowBiometric: false,
      }
    );

    if (!isAuthorized) return;

    setIsBackingUp(true);
    try {
      const armored = await ExportImportService.getArmoredVaultBackup();
      const meta = await GoogleDriveBackupService.uploadBackup(armored);
      const updatedStatus = await GoogleDriveBackupService.getStatus();
      setCloudStatus(updatedStatus);
      await HapticService.success();
      setBackupSuccess(true);
      setTimeout(() => {
        setBackupSuccess(false);
      }, 3000);
    } catch (e: any) {
      await HapticService.warning();
      Alert.alert('Backup Failed', e.message || 'Could not upload backup to Google Drive.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCloudRestoreInSettings = async () => {
    const isAuthorized = await requireAuth(
      'Enter your master password to restore from Google Drive.',
      {
        title: 'Confirm Master Password',
        confirmButtonText: 'Continue to Restore',
        allowBiometric: false,
      }
    );

    if (!isAuthorized) return;

    setIsCloudLoading(true);
    try {
      const meta = await GoogleDriveBackupService.fetchBackupMetadata();
      if (!meta) {
        Alert.alert('No Backup Found', 'No backup file was found in your Google Drive app storage.');
        return;
      }

      Alert.alert(
        'Restore From Google Drive?',
        `Found encrypted backup from:\n${formatBackupTime(meta.modifiedTime)} (${formatBytes(meta.sizeBytes)})\n\nThis will replace your current local vault items. You will need to unlock with the backup's master password.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                const armored = await GoogleDriveBackupService.downloadBackup();
                const parsed = ExportImportService.parseBackupContent(armored);
                const success = await importVaultBackup(parsed.config, parsed.payload);
                if (success) {
                  await HapticService.success();
                  Alert.alert(
                    'Restore Successful',
                    'Vault restored from Google Drive! Please enter your master password to unlock.'
                  );
                  router.replace('/unlock');
                } else {
                  throw new Error('Failed to import vault backup');
                }
              } catch (err: any) {
                await HapticService.warning();
                Alert.alert('Restore Failed', err.message || 'Could not restore backup.');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      await HapticService.warning();
      Alert.alert('Restore Failed', e.message || 'Could not check cloud backup.');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const checkBiometrics = async () => {
    const available = await BiometricService.isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handleToggleBiometric = async (value: boolean) => {
    const success = await toggleBiometric(value);
    if (!success) {
      Alert.alert('Biometric Error', 'Could not update biometric setting.');
    }
  };

  const handleAutoLockChange = (minutes: number) => {
    setAutoLockMinutes(minutes);
  };

  const handleLockNow = () => {
    lockVault();
    router.replace('/unlock');
  };

  const executeExport = async () => {
    try {
      const result = await ExportImportService.exportBackup();
      if (result.canceled) {
        Alert.alert(
          'Folder Selection Needed',
          'To save backups directly to device storage, please tap "Use this folder" on Documents (or tap ⋮ to create a folder).\n\n(Android restricts selecting the root Download folder directly).',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: executeExport },
          ]
        );
        return;
      }
      if (result.success) {
        await HapticService.success();
        Alert.alert(
          'Backup Saved to Device',
          result.fileName
            ? `Encrypted .btw-vault backup saved directly to your device as "${result.fileName}".`
            : 'Encrypted .btw-vault backup saved directly to your device.'
        );
      }
    } catch (e: any) {
      await HapticService.warning();
      Alert.alert('Export Failed', e.message || 'Could not export backup');
    }
  };

  const handleExportBackup = async () => {
    // Strictly require master password (no biometrics allowed for export)
    const isAuthorized = await requireAuth(
      'Enter your master password to export an encrypted .btw-vault backup.',
      {
        title: 'Confirm Master Password',
        confirmButtonText: 'Verify & Export',
        allowBiometric: false,
      }
    );

    if (!isAuthorized) {
      return;
    }

    if (Platform.OS === 'android') {
      const savedDir = await ExportImportService.getSavedExportDirectory();
      if (!savedDir) {
        Alert.alert(
          'Save Backup to Device',
          'To save your backup directly to device storage:\n\n1. Select "Documents" (or tap ⋮ to create a folder)\n2. Tap "Use this folder" at the bottom\n\nThe app will remember this folder so future exports save automatically!',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Choose Folder',
              onPress: executeExport,
            },
          ]
        );
        return;
      }
    }

    await executeExport();
  };

  const handleWipeVault = () => {
    HapticService.warning();
    setShowWipeModal(true);
  };

  const handleConfirmWipe = async () => {
    await wipeVault();
    setShowWipeModal(false);
    router.replace('/setup');
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <Text style={styles.sectionHeader}>Security</Text>
      <View style={styles.card}>
        {biometricAvailable && (
          <>
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleToggleBiometric(!biometricEnabled)}
              activeOpacity={0.6}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Biometric Unlock</Text>
                <Text style={styles.rowSubtitle}>Use fingerprint or face recognition</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              />
            </TouchableOpacity>
            <View style={styles.rowSeparator} />
          </>
        )}
        
        <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.rowTitle}>Auto-Lock Timeout</Text>
            <Text style={styles.rowSubtitle}>Locks instantly when minimized or after timeout</Text>
          </View>
          <View style={styles.segmentedControl}>
            {[
              { mins: 0, label: 'Instant' },
              { mins: 1, label: '1m' },
              { mins: 5, label: '5m' },
              { mins: 15, label: '15m' },
              { mins: -1, label: 'Never' },
            ].map(({ mins, label }) => {
              const isSelected = autoLockMinutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={[styles.segment, isSelected && styles.segmentActive]}
                  onPress={() => handleAutoLockChange(mins)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.rowSeparator} />

        <View style={styles.row}>
          <View style={styles.rowContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.rowTitle}>Anti-Capture Protection</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.rowSubtitle}>Blocks screenshots & screen recording across vault</Text>
          </View>
          <ShieldCheck color="#10B981" size={20} />
        </View>

        <View style={styles.rowSeparator} />

        <TouchableOpacity
          style={styles.row}
          onPress={handleLockNow}
          activeOpacity={0.6}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Lock Vault Now</Text>
            <Text style={styles.rowSubtitle}>Wipes keys from memory and locks the app</Text>
          </View>
          <Lock color="#8E8E93" size={18} />
        </TouchableOpacity>
      </View>

      {/* WhatsApp-Style Vault / Google Drive Backup */}
      <Text style={styles.sectionHeader}>Google Drive Backup</Text>
      
      {/* 1. Last Backup Summary Card */}
      <View style={styles.card}>
        <View style={styles.waHeroContainer}>
          <View style={styles.waHeroHeader}>
            <View style={styles.waIconBox}>
              <Cloud color="#0F172A" size={22} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.waTitleRow}>
                <Text style={styles.waHeroTitle}>Last Backup</Text>
                <View style={styles.waBadge}>
                  <ShieldCheck color="#10B981" size={12} style={{ marginRight: 4 }} />
                  <Text style={styles.waBadgeText}>E2E ENCRYPTED</Text>
                </View>
              </View>
              <Text style={styles.waHeroSubtitle}>
                Back up your encrypted vault to Google Drive. If you switch devices or lose your phone, your credentials remain safe and recoverable.
              </Text>
            </View>
          </View>

          {/* Backup Details Box */}
          <View style={styles.waMetaBox}>
            <View style={styles.waMetaItem}>
              <Text style={styles.waMetaLabel}>Google Drive</Text>
              <Text style={styles.waMetaValue}>{formatBackupTime(cloudStatus.lastBackupTime)}</Text>
            </View>
            <View style={styles.waMetaItem}>
              <Text style={styles.waMetaLabel}>Backup Size</Text>
              <Text style={styles.waMetaValue}>
                {cloudStatus.lastBackupSize ? formatBytes(cloudStatus.lastBackupSize) : '—'}
              </Text>
            </View>
          </View>

          {/* Primary Action "Back Up" Button */}
          <TouchableOpacity
            style={[
              styles.waBackUpButton,
              isBackingUp && styles.waBackUpButtonLoading,
              backupSuccess && styles.waBackUpButtonSuccess,
            ]}
            onPress={handleBackUpPress}
            disabled={isBackingUp || isCloudLoading}
            activeOpacity={0.85}
          >
            {isBackingUp ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 10 }} />
                <Text style={styles.waBackUpButtonText}>Backing Up to Drive...</Text>
              </>
            ) : backupSuccess ? (
              <>
                <CheckCircle2 color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
                <Text style={styles.waBackUpButtonText}>Backup Complete!</Text>
              </>
            ) : (
              <>
                <UploadCloud color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
                <Text style={styles.waBackUpButtonText}>
                  {!cloudStatus.isConnected ? 'Link Account & Back Up' : 'Back Up'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Google Drive Settings (WhatsApp Group) */}
      <Text style={styles.sectionHeader}>Google Drive Settings</Text>
      <View style={styles.card}>
        {/* Google Account */}
        <TouchableOpacity
          style={styles.row}
          onPress={handleGoogleAccountPress}
          activeOpacity={0.6}
          disabled={isCloudLoading}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Google Account</Text>
            <Text
              style={[
                styles.rowSubtitle,
                !cloudStatus.isConnected && { color: '#2563EB', fontWeight: '500' },
              ]}
              numberOfLines={1}
            >
              {isCloudLoading
                ? 'Connecting to Google...'
                : cloudStatus.account?.email || 'Tap to link Google account'}
            </Text>
          </View>
          {isCloudLoading ? (
            <ActivityIndicator color="#2563EB" size="small" />
          ) : (
            <ChevronRight color="#C7C7CC" size={20} />
          )}
        </TouchableOpacity>

        <View style={styles.rowSeparator} />

        {/* Back up to Google Drive (Sync Frequency) */}
        <TouchableOpacity
          style={styles.row}
          onPress={handleSyncFrequencyPress}
          activeOpacity={0.6}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Back up to Google Drive</Text>
            <Text style={styles.rowSubtitle}>
              {cloudStatus.autoSync === 'on_change'
                ? 'Auto-sync on changes'
                : 'Only when I tap "Back Up"'}
            </Text>
          </View>
          <ChevronRight color="#C7C7CC" size={20} />
        </TouchableOpacity>

        <View style={styles.rowSeparator} />

        {/* Back up over */}
        <TouchableOpacity
          style={styles.row}
          onPress={handleNetworkPrefPress}
          activeOpacity={0.6}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Back up over</Text>
            <Text style={styles.rowSubtitle}>
              {cloudStatus.networkPref === 'wifi_only' ? 'Wi-Fi only' : 'Wi-Fi or cellular'}
            </Text>
          </View>
          <ChevronRight color="#C7C7CC" size={20} />
        </TouchableOpacity>

        {cloudStatus.isConnected && (
          <>
            <View style={styles.rowSeparator} />

            {/* Restore from Google Drive */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleCloudRestoreInSettings}
              activeOpacity={0.6}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Restore from Google Drive</Text>
                <Text style={styles.rowSubtitle}>
                  Download and decrypt existing cloud backup
                </Text>
              </View>
              <ChevronRight color="#C7C7CC" size={20} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.sectionHeader}>Data & Storage</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleExportBackup} activeOpacity={0.5}>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Export Backup</Text>
            <Text style={styles.rowSubtitle}>Save encrypted .btw-vault file to your device</Text>
          </View>
          <ChevronRight color="#C7C7CC" size={20} />
        </TouchableOpacity>
        <View style={styles.rowSeparator} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/encrypted-db')}
          activeOpacity={0.5}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Local Encrypted Database</Text>
            <Text style={styles.rowSubtitle}>View zero-knowledge ciphertext & storage files</Text>
          </View>
          <ChevronRight color="#C7C7CC" size={20} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Danger Zone</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleWipeVault} activeOpacity={0.5}>
          <View style={styles.rowContent}>
            <Text style={styles.rowDangerTitle}>Wipe Vault</Text>
          </View>
          <ChevronRight color="#C7C7CC" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>btw vault v1.0.0</Text>
      </View>
    </ScrollView>
    {AuthModal}
    <WipeVaultModal
      visible={showWipeModal}
      onClose={() => setShowWipeModal(false)}
      onConfirm={handleConfirmWipe}
    />
    <CloudBackupModal
      visible={cloudModalType !== null}
      type={cloudModalType}
      onClose={() => setCloudModalType(null)}
      networkPref={cloudStatus.networkPref}
      autoSync={cloudStatus.autoSync}
      userEmail={cloudStatus.account?.email}
      isLoading={isCloudLoading}
      onSelectNetworkPref={async (pref) => {
        await GoogleDriveBackupService.setNetworkPreference(pref);
        const updated = await GoogleDriveBackupService.getStatus();
        setCloudStatus(updated);
      }}
      onSelectSyncFrequency={async (freq) => {
        await GoogleDriveBackupService.setAutoSync(freq);
        const updated = await GoogleDriveBackupService.getStatus();
        setCloudStatus(updated);
      }}
      onSwitchAccount={async () => {
        await handleConnectGoogleDrive();
      }}
      onUnlinkAccount={handleDisconnectGoogleDrive}
      onLinkAccount={async () => {
        const connected = await handleConnectGoogleDrive();
        if (connected) {
          await performCloudBackup();
        }
      }}
    />
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingVertical: 24,
  },
  sectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 32,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  rowContent: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 17,
    color: '#000000',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  rowDangerTitle: {
    fontSize: 17,
    color: '#FF3B30',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginTop: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  activeBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  waHeroContainer: {
    padding: 16,
    gap: 14,
  },
  waHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  waIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  waHeroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  waHeroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  waBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  waBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  waMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  waMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waMetaLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  waMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  waBackUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    height: 48,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  waBackUpButtonLoading: {
    backgroundColor: '#1E293B',
    opacity: 0.9,
  },
  waBackUpButtonSuccess: {
    backgroundColor: '#0F172A',
  },
  waBackUpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
