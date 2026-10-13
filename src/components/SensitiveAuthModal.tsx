import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  Animated,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff, ShieldAlert, Fingerprint, X } from 'lucide-react-native';
import { useVault } from '../context/VaultContext';
import { BiometricService } from '../core/security/biometricService';
import { HapticService } from '../core/haptics';

export interface SensitiveAuthModalProps {
  visible: boolean;
  title?: string;
  reason?: string;
  confirmButtonText?: string;
  allowBiometric?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SensitiveAuthModal: React.FC<SensitiveAuthModalProps> = ({
  visible,
  title = 'Security Verification',
  reason = 'Enter your master password to continue',
  confirmButtonText = 'Verify',
  allowBiometric = true,
  onSuccess,
  onCancel,
}) => {
  const { verifyMasterPassword, biometricEnabled } = useVault();
  const { height: windowHeight } = useWindowDimensions();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsVerifying(false);
      setIsFocused(false);
    }
  }, [visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      Animated.timing(keyboardHeightAnim, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightAnim]);

  const handleVerify = async () => {
    if (!password.trim() || isVerifying) {
      if (!password.trim()) {
        await HapticService.warning();
        setError('Please enter your master password.');
      }
      return;
    }

    Keyboard.dismiss();
    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyMasterPassword(password);
      if (isValid) {
        await HapticService.success();
        onSuccess();
      } else {
        await HapticService.warning();
        setError('Incorrect Master Password.');
      }
    } catch {
      await HapticService.warning();
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBiometricRetry = async () => {
    try {
      const bioOk = await BiometricService.authenticate(reason);
      if (bioOk) {
        await HapticService.success();
        onSuccess();
      }
    } catch {
      // User cancelled or failed
    }
  };

  const handleCancel = () => {
    if (isVerifying) return;
    Keyboard.dismiss();
    HapticService.selection();
    onCancel();
  };

  const handleBackdropPress = () => {
    if (isVerifying) return;
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      handleCancel();
    }
  };

  const maxSheetHeight = isKeyboardVisible
    ? Math.max(windowHeight - keyboardHeight - 30, 260)
    : Math.min(windowHeight * 0.85, 520);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleCancel}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Full-Screen Dimmed Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss verification modal"
        />

        {/* Bottom sheet wrapper lifting above keyboard */}
        <View style={styles.sheetWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheetCard,
              {
                marginBottom: keyboardHeightAnim,
                maxHeight: maxSheetHeight,
              },
            ]}
          >
            {/* Top Indicator Handle */}
            <View style={styles.indicatorContainer}>
              <View style={styles.indicator} />
            </View>

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header with Security Badge */}
              <View style={styles.headerRow}>
                <View style={styles.badge}>
                  <Lock color="#007AFF" size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {reason}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  disabled={isVerifying}
                >
                  <X color="#8E8E93" size={18} />
                </TouchableOpacity>
              </View>

              {/* Error Box */}
              {error ? (
                <View style={styles.errorBox}>
                  <ShieldAlert color="#DC2626" size={16} style={{ marginRight: 8, flexShrink: 0 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Master Password Input Container */}
              <View
                style={[
                  styles.inputContainer,
                  isFocused && styles.inputFocused,
                  error ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  placeholder="Master Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  autoFocus
                  editable={!isVerifying}
                />
                <TouchableOpacity
                  onPress={() => {
                    HapticService.selection();
                    setShowPassword(!showPassword);
                  }}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  {showPassword ? <EyeOff color="#8E8E93" size={18} /> : <Eye color="#8E8E93" size={18} />}
                </TouchableOpacity>
              </View>

              {/* Biometric Quick Retry Button (if available and allowed) */}
              {biometricEnabled && allowBiometric ? (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricRetry}
                  activeOpacity={0.7}
                  disabled={isVerifying}
                >
                  <Fingerprint color="#007AFF" size={18} style={{ marginRight: 8 }} />
                  <Text style={styles.biometricBtnText}>Use Biometric Unlock</Text>
                </TouchableOpacity>
              ) : null}

              {/* Action Buttons Row */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                  disabled={isVerifying}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.verifyBtn,
                    (!password.trim() || isVerifying) && styles.verifyBtnDisabled,
                  ]}
                  onPress={handleVerify}
                  activeOpacity={0.8}
                  disabled={isVerifying || !password.trim()}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>{confirmButtonText}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {!isKeyboardVisible && <SafeAreaView edges={['bottom']} />}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

export interface RequireAuthOptions {
  title?: string;
  confirmButtonText?: string;
  allowBiometric?: boolean;
}

/**
 * Reusable Hook for protecting sensitive credentials with Biometrics & Master Password
 */
export function useSensitiveAuth() {
  const { biometricEnabled } = useVault();
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Security Verification');
  const [reason, setReason] = useState('Enter master password to view this secret');
  const [confirmButtonText, setConfirmButtonText] = useState('Verify');
  const [allowBiometric, setAllowBiometric] = useState(true);

  const requireAuth = useCallback(
    async (
      promptReason: string = 'Enter master password to view this secret',
      options?: RequireAuthOptions
    ): Promise<boolean> => {
      const allowBio = options?.allowBiometric !== false;
      const modalTitle = options?.title || 'Security Verification';
      const confirmText = options?.confirmButtonText || 'Verify';

      // 1. Try Biometrics first only if allowed AND available & enabled
      if (allowBio && biometricEnabled) {
        const hasHardware = await BiometricService.isBiometricAvailable();
        if (hasHardware) {
          const bioOk = await BiometricService.authenticate(promptReason);
          if (bioOk) {
            await HapticService.success();
            return true;
          }
        }
      }

      // 2. Fall back to Master Password prompt dialog
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setTitle(modalTitle);
        setReason(promptReason);
        setConfirmButtonText(confirmText);
        setAllowBiometric(allowBio);
        setVisible(true);
      });
    },
    [biometricEnabled]
  );

  const handleSuccess = useCallback(() => {
    setVisible(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setVisible(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const AuthModal = (
    <SensitiveAuthModal
      visible={visible}
      title={title}
      reason={reason}
      confirmButtonText={confirmButtonText}
      allowBiometric={allowBiometric}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );

  return {
    requireAuth,
    AuthModal,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetWrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  indicatorContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  indicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    marginBottom: 14,
  },
  biometricBtnText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  verifyBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  verifyBtnDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
