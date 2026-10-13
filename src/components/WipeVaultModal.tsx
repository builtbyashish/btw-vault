import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  Animated,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react-native';
import { HapticService } from '../core/haptics';

export interface WipeVaultModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
}

export const WipeVaultModal: React.FC<WipeVaultModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title = 'Wipe Entire Vault',
  description = 'THIS WILL PERMANENTLY DELETE ALL LOCAL ENCRYPTED DATA! Passwords, cards, and secure notes cannot be recovered without a .btw-vault backup.',
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const [inputText, setInputText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setInputText('');
      setIsWiping(false);
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

  const isMatch = inputText.trim().toLowerCase() === 'delete';

  const handleClose = () => {
    if (isWiping) return;
    Keyboard.dismiss();
    HapticService.selection();
    onClose();
  };

  const handleBackdropPress = () => {
    if (isWiping) return;
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      handleClose();
    }
  };

  const handleConfirm = async () => {
    if (!isMatch || isWiping) return;
    Keyboard.dismiss();
    setIsWiping(true);
    try {
      await HapticService.warning();
      await onConfirm();
    } catch {
      setIsWiping(false);
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
      onRequestClose={handleClose}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Full screen backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss wipe confirmation"
        />

        {/* Modal content container pinned to bottom */}
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
              {/* Header with Danger Badge */}
              <View style={styles.headerRow}>
                <View style={styles.badge}>
                  <Trash2 color="#DC2626" size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>Irreversible Destructive Action</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  disabled={isWiping}
                >
                  <X color="#8E8E93" size={18} />
                </TouchableOpacity>
              </View>

              {/* Warning Banner */}
              <View style={styles.warningBox}>
                <AlertTriangle color="#DC2626" size={18} style={styles.warningIcon} />
                <Text style={styles.warningText}>{description}</Text>
              </View>

              {/* Confirmation Input Prompt */}
              <View style={styles.promptContainer}>
                <Text style={styles.promptLabel}>
                  To confirm, type <Text style={styles.promptHighlight}>delete</Text> below:
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused,
                    isMatch && styles.inputMatch,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder='Type "delete"'
                    placeholderTextColor="#9CA3AF"
                    value={inputText}
                    onChangeText={setInputText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="done"
                    editable={!isWiping}
                  />
                  {isMatch && (
                    <View style={styles.matchBadge}>
                      <CheckCircle2 color="#16A34A" size={18} strokeWidth={2.4} />
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={isWiping}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.wipeBtn,
                    !isMatch && styles.wipeBtnDisabled,
                    isWiping && styles.wipeBtnLoading,
                  ]}
                  onPress={handleConfirm}
                  disabled={!isMatch || isWiping}
                  activeOpacity={0.8}
                >
                  {isWiping ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[styles.wipeBtnText, !isMatch && styles.wipeBtnTextDisabled]}>
                      Wipe Vault
                    </Text>
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

export default WipeVaultModal;

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
    maxHeight: '90%',
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
    backgroundColor: '#FEE2E2',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningIcon: {
    marginRight: 10,
    marginTop: 2,
    flexShrink: 0,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#991B1B',
    fontWeight: '500',
  },
  promptContainer: {
    marginBottom: 18,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  promptHighlight: {
    fontWeight: '700',
    color: '#DC2626',
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
  },
  inputFocused: {
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
  },
  inputMatch: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
  },
  matchBadge: {
    marginLeft: 8,
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
  wipeBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  wipeBtnDisabled: {
    backgroundColor: '#FEE2E2',
    shadowOpacity: 0,
    elevation: 0,
  },
  wipeBtnLoading: {
    opacity: 0.8,
  },
  wipeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  wipeBtnTextDisabled: {
    color: '#F87171',
  },
});
