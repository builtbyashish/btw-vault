import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Fingerprint } from 'lucide-react-native';
import { useVault } from '../context/VaultContext';
import { BiometricService } from '../core/security/biometricService';
import { BiometricPromptService } from '../core/security/biometricPromptService';
import { HapticService } from '../core/haptics';

export function BiometricSetupModal() {
  const { status, biometricEnabled, toggleBiometric } = useVault();
  const [visible, setVisible] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (status === 'unlocked' && !biometricEnabled) {
      checkShouldPrompt();
    } else {
      setVisible(false);
    }
  }, [status, biometricEnabled]);

  const checkShouldPrompt = async () => {
    try {
      const shouldPrompt = await BiometricPromptService.shouldPromptBiometric();
      if (!shouldPrompt) return;

      openModal();
    } catch {
      // Ignore checks
    }
  };

  const openModal = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  const handleEnableBiometrics = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    try {
      const authenticated = await BiometricService.authenticate(
        'Authorize biometric quick unlock'
      );

      if (authenticated) {
        const success = await toggleBiometric(true);
        if (success) {
          await BiometricPromptService.clearBiometricPromptState();
          await HapticService.success();
          closeModal();
          return;
        }
      }
      await HapticService.warning();
    } catch {
      await HapticService.warning();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRemindInOneWeek = async () => {
    await HapticService.selection();
    await BiometricPromptService.snoozeBiometricForOneWeek();
    closeModal();
  };

  const handleSkip = async () => {
    await HapticService.selection();
    await BiometricPromptService.skipBiometricPrompt();
    closeModal();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleSkip}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Biometric Icon Emblem */}
          <View style={styles.iconCircle}>
            <Fingerprint color="#007AFF" size={34} strokeWidth={2.2} />
          </View>

          {/* Heading and Body */}
          <Text style={styles.title}>Enable Biometric Unlock?</Text>
          <Text style={styles.description}>
            Your vault was restored from backup. Enable biometric unlock to access your notes and
            cards quickly and securely without retyping your master password.
          </Text>

          {/* Actions Stack */}
          <View style={styles.buttonStack}>
            {/* Primary: Enable Now */}
            <TouchableOpacity
              style={[styles.primaryButton, isAuthenticating && styles.buttonDisabled]}
              onPress={handleEnableBiometrics}
              disabled={isAuthenticating}
              activeOpacity={0.8}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Enable Biometric Unlock</Text>
              )}
            </TouchableOpacity>

            {/* Secondary: Remind in 1 Week */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRemindInOneWeek}
              disabled={isAuthenticating}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Remind in 1 Week</Text>
            </TouchableOpacity>

            {/* Tertiary: Skip */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isAuthenticating}
              activeOpacity={0.6}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6C6C70',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  skipButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
});
