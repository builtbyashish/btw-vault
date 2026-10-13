import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw, Copy, Check, X } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { ClipboardService } from '../core/security/clipboardService';
import { HapticService } from '../core/haptics';

interface PasswordGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
  onUsePassword: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  visible,
  onClose,
  onUsePassword,
}) => {
  const [length, setLength] = useState<number>(18);
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useLower, setUseLower] = useState<boolean>(true);
  const [useDigits, setUseDigits] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const generate = (): string => {
    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useDigits) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    const randomBytes = Crypto.getRandomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return result;
  };

  const [generatedPassword, setGeneratedPassword] = useState<string>(generate());

  const handleRegenerate = () => {
    HapticService.impactMedium();
    setGeneratedPassword(generate());
    setCopied(false);
  };

  const handleCopy = async () => {
    await ClipboardService.copyWithAutoClear(generatedPassword, 30);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    HapticService.selection();
    onUsePassword(generatedPassword);
    onClose();
  };

  const strength = useMemo(() => {
    let score = 0;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;
    if (useUpper && useLower) score += 1;
    if (useDigits) score += 1;
    if (useSymbols) score += 1;

    if (score <= 2) return { label: 'Weak', color: '#FF3B30', percent: '40%' as const };
    if (score <= 3) return { label: 'Moderate', color: '#FF9500', percent: '65%' as const };
    if (score <= 4) return { label: 'Strong', color: '#34C759', percent: '85%' as const };
    return { label: 'Maximum Security', color: '#007AFF', percent: '100%' as const };
  }, [length, useUpper, useLower, useDigits, useSymbols]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Password Generator</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X color="#8E8E93" size={18} />
            </TouchableOpacity>
          </View>

          {/* Password Output */}
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordText} numberOfLines={2}>
              {generatedPassword}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleRegenerate}
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <RefreshCw color="#007AFF" size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCopy}
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                {copied ? <Check color="#34C759" size={18} /> : <Copy color="#007AFF" size={18} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Strength Bar */}
          <View style={styles.strengthRow}>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { width: strength.percent, backgroundColor: strength.color }]} />
            </View>
            <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
          </View>

          {/* Length Stepper */}
          <View style={styles.lengthRow}>
            <Text style={styles.optionLabel}>Length</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  setLength((l) => Math.max(8, l - 1));
                  handleRegenerate();
                }}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.lengthText}>{length}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  setLength((l) => Math.min(64, l + 1));
                  handleRegenerate();
                }}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Switches */}
          <View style={styles.switchesContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Uppercase</Text>
              <Switch
                value={useUpper}
                onValueChange={(v) => {
                  setUseUpper(v);
                  handleRegenerate();
                }}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Lowercase</Text>
              <Switch
                value={useLower}
                onValueChange={(v) => {
                  setUseLower(v);
                  handleRegenerate();
                }}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Numbers</Text>
              <Switch
                value={useDigits}
                onValueChange={(v) => {
                  setUseDigits(v);
                  handleRegenerate();
                }}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>

            <View style={[styles.switchRow, styles.lastSwitchRow]}>
              <Text style={styles.switchLabel}>Symbols</Text>
              <Switch
                value={useSymbols}
                onValueChange={(v) => {
                  setUseSymbols(v);
                  handleRegenerate();
                }}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleApply} style={styles.useBtn} activeOpacity={0.8}>
            <Text style={styles.useBtnText}>Use Password</Text>
          </TouchableOpacity>
          <SafeAreaView />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  optionLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '400',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: '400',
  },
  lengthText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'center',
  },
  switchesContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  lastSwitchRow: {
    borderBottomWidth: 0,
  },
  switchLabel: {
    color: '#000000',
    fontSize: 16,
  },
  useBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  useBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
