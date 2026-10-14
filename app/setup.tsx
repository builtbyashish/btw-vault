import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldAlert,
  FolderArchive,
  Fingerprint,
  Cloud,
} from 'lucide-react-native';
import { useVault } from '../src/context/VaultContext';
import { BiometricService } from '../src/core/security/biometricService';
import { BtwVaultLogo } from '../src/components/BtwVaultLogo';
import { HapticService } from '../src/core/haptics';
import { ExportImportService } from '../src/core/migration/exportImportService';
import { GoogleDriveBackupService } from '../src/core/cloud/googleDriveBackupService';

export default function SetupScreen() {
  const { setupVault, importVaultBackup, isLoading, error } = useVault();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [localError, setLocalError] = useState('');
  const [focusedField, setFocusedField] = useState<'password' | 'confirm' | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  const confirmInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    checkBiometrics();

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const checkBiometrics = async () => {
    const available = await BiometricService.isBiometricAvailable();
    setBiometricAvailable(available);
    if (available) {
      setEnableBiometric(true);
    }
  };

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '#CBD5E1' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (score === 3) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score === 4) return { score: 3, label: 'Strong', color: '#10B981' };
    return { score: 4, label: 'Maximum', color: '#059669' };
  }, [password]);

  const isMatching =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleCreateVault = async () => {
    setLocalError('');
    if (!password || password.length < 8) {
      await HapticService.warning();
      setLocalError('Master password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      await HapticService.warning();
      setLocalError('Passwords do not match.');
      return;
    }

    const success = await setupVault(password, enableBiometric);
    if (success) {
      await HapticService.success();
      router.replace('/(tabs)');
    } else {
      await HapticService.warning();
    }
  };

  const handleImportBackupOnSetup = () => {
    Alert.alert(
      'Restore From .btw-vault Backup?',
      'Restore an existing encrypted .btw-vault backup file from your device storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select .btw-vault File',
          onPress: async () => {
            try {
              const data = await ExportImportService.importBackup();
              const dateStr = data.exportedAt
                ? new Date(data.exportedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Unknown date';

              Alert.alert(
                'Confirm Restore',
                `Found valid .btw-vault backup created on:\n${dateStr}\n\nRestore this vault to your device?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Restore Vault',
                    onPress: async () => {
                      const success = await importVaultBackup(data.config, data.payload);
                      if (success) {
                        await HapticService.success();
                        Alert.alert(
                          'Restore Successful',
                          'Vault restored! Please enter your master password to unlock.'
                        );
                        router.replace('/unlock');
                      } else {
                        await HapticService.warning();
                        Alert.alert('Restore Failed', 'Could not apply vault backup.');
                      }
                    },
                  },
                ]
              );
            } catch (e: any) {
              if (e.message !== 'Import canceled') {
                await HapticService.warning();
                Alert.alert('Import Failed', e.message || 'Could not import backup file.');
              }
            }
          },
        },
      ]
    );
  };

  const handleGoogleDriveRestoreOnSetup = async () => {
    if (!GoogleDriveBackupService.isConfigured()) {
      Alert.alert(
        'Google Drive Not Configured',
        'Please ensure EXPO_PUBLIC_GOOGLE_CLIENT_ID is configured in your .env file.'
      );
      return;
    }

    setIsCloudLoading(true);
    try {
      const status = await GoogleDriveBackupService.getStatus();
      if (!status.isConnected) {
        await GoogleDriveBackupService.authenticate();
      }

      const meta = await GoogleDriveBackupService.fetchBackupMetadata();
      if (!meta) {
        Alert.alert(
          'No Backup Found',
          'No encrypted vault backup was found in the connected Google Drive account.'
        );
        return;
      }

      const dateStr = meta.modifiedTime
        ? new Date(meta.modifiedTime).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Unknown date';

      const sizeStr = meta.sizeBytes
        ? ` (${(meta.sizeBytes / 1024).toFixed(1)} KB)`
        : '';

      Alert.alert(
        'Confirm Cloud Restore',
        `Found valid encrypted backup created on:\n${dateStr}${sizeStr}\n\nRestore this vault to your device?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Vault',
            onPress: async () => {
              try {
                const armored = await GoogleDriveBackupService.downloadBackup();
                const data = ExportImportService.parseBackupContent(armored);
                const success = await importVaultBackup(data.config, data.payload);
                if (success) {
                  await HapticService.success();
                  Alert.alert(
                    'Restore Successful',
                    'Vault restored! Please enter your master password to unlock.'
                  );
                  router.replace('/unlock');
                } else {
                  await HapticService.warning();
                  Alert.alert('Restore Failed', 'Could not apply vault backup.');
                }
              } catch (restoreErr: any) {
                await HapticService.warning();
                Alert.alert(
                  'Restore Failed',
                  restoreErr.message || 'Could not download or restore cloud backup.'
                );
              }
            },
          },
        ]
      );
    } catch (e: any) {
      if (!e.message?.includes('canceled') && !e.message?.includes('dismissed')) {
        await HapticService.warning();
        Alert.alert('Cloud Restore Error', e.message || 'Could not connect to Google Drive.');
      }
    } finally {
      setIsCloudLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardHeight > 0 && {
              justifyContent: 'flex-start',
              paddingTop: 16,
              paddingBottom: keyboardHeight + 36,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.innerWrapper}>
            {/* Header Hero */}
            <View style={styles.header}>
              <BtwVaultLogo size={42} style={styles.logo} />
              <Text style={styles.subtitle}>
                Set a master password to encrypt your vault data
              </Text>
            </View>

            {/* Error Notification */}
            {displayError ? (
              <View style={styles.errorBox}>
                <ShieldAlert color="#DC2626" size={17} style={styles.errorIcon} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            {/* Form Fields & Controls */}
            <View style={styles.formSection}>
              {/* Master Password Input */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputFocused,
                ]}
              >
                <Lock
                  color={focusedField === 'password' ? '#0F172A' : '#94A3B8'}
                  size={19}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Master password (min 8 chars)"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (localError) setLocalError('');
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmInputRef.current?.focus()}
                />
                <TouchableOpacity
                  onPress={() => {
                    HapticService.selection();
                    setShowPassword(!showPassword);
                  }}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff color="#64748B" size={19} />
                  ) : (
                    <Eye color="#64748B" size={19} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthSegments}>
                    {[1, 2, 3, 4].map((segIndex) => (
                      <View
                        key={segIndex}
                        style={[
                          styles.strengthSegment,
                          {
                            backgroundColor:
                              segIndex <= strength.score ? strength.color : '#E2E8F0',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}

              {/* Confirm Password Input */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'confirm' && styles.inputFocused,
                  isMatching && styles.inputMatch,
                ]}
              >
                <Lock
                  color={focusedField === 'confirm' ? '#0F172A' : '#94A3B8'}
                  size={19}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmInputRef}
                  style={styles.input}
                  placeholder="Confirm master password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (localError) setLocalError('');
                  }}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateVault}
                />
                {isMatching && (
                  <CheckCircle2 color="#16A34A" size={19} style={{ marginRight: 6 }} />
                )}
                <TouchableOpacity
                  onPress={() => {
                    HapticService.selection();
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff color="#64748B" size={19} />
                  ) : (
                    <Eye color="#64748B" size={19} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Biometric Unlock Toggle */}
              {biometricAvailable && (
                <View style={styles.switchRow}>
                  <View style={styles.switchLeft}>
                    <View style={styles.switchIconBox}>
                      <Fingerprint color="#0F172A" size={19} />
                    </View>
                    <Text style={styles.switchTitle}>Enable Biometric Unlock</Text>
                  </View>
                  <Switch
                    value={enableBiometric}
                    onValueChange={(val) => {
                      HapticService.selection();
                      setEnableBiometric(val);
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#0F172A' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}

              {/* Primary Action Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleCreateVault}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create Secure Vault</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Restore from Backup Button */}
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleImportBackupOnSetup}
              disabled={isLoading || isCloudLoading}
              activeOpacity={0.7}
            >
              <FolderArchive color="#0F172A" size={18} style={styles.restoreIcon} />
              <Text style={styles.restoreBtnText}>Restore Existing .btw-vault Backup</Text>
            </TouchableOpacity>

            {/* Restore from Google Drive Button */}
            <TouchableOpacity
              style={[styles.restoreBtn, { marginTop: 10 }]}
              onPress={handleGoogleDriveRestoreOnSetup}
              disabled={isLoading || isCloudLoading}
              activeOpacity={0.7}
            >
              {isCloudLoading ? (
                <ActivityIndicator color="#0F172A" size="small" style={styles.restoreIcon} />
              ) : (
                <Cloud color="#0F172A" size={18} style={styles.restoreIcon} />
              )}
              <Text style={styles.restoreBtnText}>
                {isCloudLoading ? 'Connecting to Drive...' : 'Restore from Google Drive'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  inputFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputMatch: {
    borderColor: '#16A34A',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  strengthSegments: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  strengthSegment: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 18,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  switchTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  restoreIcon: {
    marginRight: 8,
  },
  restoreBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
