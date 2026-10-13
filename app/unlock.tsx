import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lock, Fingerprint, Eye, EyeOff, ShieldAlert } from 'lucide-react-native';
import { useVault } from '../src/context/VaultContext';
import { BtwVaultLogo } from '../src/components/BtwVaultLogo';
import { HapticService } from '../src/core/haptics';
import { WipeVaultModal } from '../src/components/WipeVaultModal';

export default function UnlockScreen() {
  const {
    unlockWithPassword,
    unlockWithBiometrics,
    biometricEnabled,
    wipeVault,
    isLoading,
    error,
  } = useVault();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
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

  useEffect(() => {
    if (biometricEnabled) {
      handleBiometricUnlock();
    }
  }, [biometricEnabled]);

  const handleBiometricUnlock = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      await HapticService.success();
      router.replace('/(tabs)');
    } else {
      await HapticService.warning();
    }
  };

  const handlePasswordUnlock = async () => {
    setLocalError('');
    if (!password) {
      await HapticService.warning();
      setLocalError('Please enter your master password.');
      return;
    }

    const success = await unlockWithPassword(password);
    if (success) {
      await HapticService.success();
      router.replace('/(tabs)');
    } else {
      await HapticService.warning();
    }
  };

  const handleResetVault = () => {
    Keyboard.dismiss();
    HapticService.warning();
    setShowWipeModal(true);
  };

  const handleConfirmWipe = async () => {
    await wipeVault();
    setShowWipeModal(false);
    router.replace('/setup');
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
              paddingTop: 20,
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
                Enter master password to unlock your vault
              </Text>
            </View>

            {/* Error Notification */}
            {displayError ? (
              <View style={styles.errorBox}>
                <ShieldAlert color="#DC2626" size={17} style={styles.errorIcon} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            {/* Form Fields & Actions */}
            <View style={styles.formSection}>
              {/* Password Input Container */}
              <View
                style={[
                  styles.inputContainer,
                  isFocused && styles.inputFocused,
                  displayError ? styles.inputError : null,
                ]}
              >
                <Lock
                  color={isFocused ? '#0F172A' : '#94A3B8'}
                  size={19}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Master password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (localError) setLocalError('');
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handlePasswordUnlock}
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

              {/* Primary Unlock Button */}
              <TouchableOpacity
                style={[
                  styles.unlockBtn,
                  (isLoading || !password) && styles.unlockBtnDisabled,
                ]}
                onPress={handlePasswordUnlock}
                disabled={isLoading || !password}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.unlockBtnText}>Unlock Vault</Text>
                )}
              </TouchableOpacity>

              {/* Biometric Button (if enabled) */}
              {biometricEnabled ? (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricUnlock}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Fingerprint color="#0F172A" size={19} />
                  <Text style={styles.biometricText}>Unlock with Biometrics</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Footer Reset Action */}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleResetVault}
              activeOpacity={0.6}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.resetText}>
                Forgot password?{' '}
                <Text style={styles.resetHighlight}>Reset Vault</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <WipeVaultModal
          visible={showWipeModal}
          onClose={() => setShowWipeModal(false)}
          onConfirm={handleConfirmWipe}
          title="Reset Vault & Wipe"
          description="Forgot master password? Resetting will permanently wipe all local encrypted vault data. You can restore later from a .btw-vault backup."
        />
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
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
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
  unlockBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  unlockBtnDisabled: {
    opacity: 0.45,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  biometricText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.1,
  },
  resetBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 28,
    alignItems: 'center',
  },
  resetText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  resetHighlight: {
    color: '#0F172A',
    fontWeight: '600',
  },
});
