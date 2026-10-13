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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';
import { useVault } from '../../src/context/VaultContext';
import { BiometricService } from '../../src/core/security/biometricService';
import { ExportImportService } from '../../src/core/migration/exportImportService';
import { HapticService } from '../../src/core/haptics';
import { useSensitiveAuth } from '../../src/components/SensitiveAuthModal';
import { WipeVaultModal } from '../../src/components/WipeVaultModal';

export default function SettingsScreen() {
  const {
    biometricEnabled,
    toggleBiometric,
    autoLockMinutes,
    setAutoLockMinutes,
    lockVault,
    wipeVault,
  } = useVault();
  const { requireAuth, AuthModal } = useSensitiveAuth();
  const router = useRouter();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

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
});
