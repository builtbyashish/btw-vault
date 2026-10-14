import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Radio,
  ShieldCheck,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { CardDetails, VaultItem } from '../types';
import { ClipboardService } from '../core/security/clipboardService';
import { HapticService } from '../core/haptics';
import { useSensitiveAuth } from './SensitiveAuthModal';
import { CardNetworkLogo } from '../card-validator/logos';
import { resolveCardTheme } from '../card-validator/theme';

interface CreditCardViewProps {
  item?: VaultItem;
  cardDetails?: CardDetails;
  title?: string;
  onRequireAuth?: (reason: string) => Promise<boolean>;
  onCopied?: (field: string) => void;
}

export const CreditCardView: React.FC<CreditCardViewProps> = ({
  item,
  cardDetails: propCardDetails,
  title: propTitle,
  onRequireAuth,
  onCopied,
}) => {
  const localAuth = useSensitiveAuth();
  const authenticate = onRequireAuth || localAuth.requireAuth;

  const card = item?.cardDetails || propCardDetails || {};
  const cardTitle = item?.title || propTitle || 'Payment Card';
  const cardTheme = resolveCardTheme(card.cardBrand, card.cardNumber);
  const gradTheme = cardTheme;
  const effectiveNetwork = cardTheme.effectiveNetwork;

  const [showNumber, setShowNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (val: string, label: string) => {
    if (!val) return;
    await ClipboardService.copyWithAutoClear(val, 30);
    await HapticService.selection();
    setCopiedField(label);
    if (onCopied) onCopied(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleNumber = async () => {
    if (showNumber) {
      await HapticService.selection();
      setShowNumber(false);
      return;
    }
    const ok = await authenticate('Authenticate to reveal full card number');
    if (ok) {
      await HapticService.success();
      setShowNumber(true);
    }
  };

  const handleCopyNumber = async () => {
    if (!card.cardNumber) return;
    if (isLast4) {
      await handleCopy(last4, 'card');
      return;
    }
    if (!showNumber) {
      const ok = await authenticate('Authenticate to copy card number');
      if (!ok) return;
    }
    const raw = card.cardNumber.replace(/\s+/g, '');
    await handleCopy(raw, 'card');
  };

  const handleToggleCvv = async () => {
    if (showCvv) {
      await HapticService.selection();
      setShowCvv(false);
      return;
    }
    const ok = await authenticate('Authenticate to reveal security code (CVV)');
    if (ok) {
      await HapticService.success();
      setShowCvv(true);
    }
  };

  const handleCopyCvv = async () => {
    if (!card.cvv) return;
    if (!showCvv) {
      const ok = await authenticate('Authenticate to copy CVV code');
      if (!ok) return;
    }
    await handleCopy(card.cvv, 'cvv');
  };

  const handleTogglePin = async () => {
    if (showPin) {
      await HapticService.selection();
      setShowPin(false);
      return;
    }
    const ok = await authenticate('Authenticate to reveal ATM PIN');
    if (ok) {
      await HapticService.success();
      setShowPin(true);
    }
  };

  const handleCopyPin = async () => {
    if (!card.pin) return;
    if (!showPin) {
      const ok = await authenticate('Authenticate to copy ATM PIN');
      if (!ok) return;
    }
    await handleCopy(card.pin, 'pin');
  };

  // Card formatting
  const rawClean = card.cardNumber?.replace(/\s+/g, '') || '';
  const isLast4 = card.cardNumberType === 'last4' || (rawClean.length > 0 && rawClean.length <= 4);
  const last4 = rawClean.slice(-4) || '••••';
  const first4 = rawClean.length >= 8 ? rawClean.slice(0, 4) : '••••';

  const maskedDisplay = isLast4
    ? `••••  ••••  ••••  ${last4}`
    : rawClean.length >= 8
    ? `${first4}  ••••  ••••  ${last4}`
    : `••••  ••••  ••••  ${last4}`;

  const revealedDisplay = isLast4
    ? `••••  ••••  ••••  ${last4}`
    : rawClean.length > 0
    ? rawClean.replace(/(\d{4})/g, '$1  ').trim()
    : '••••  ••••  ••••  ••••';

  const currentDisplayNumber = showNumber ? revealedDisplay : maskedDisplay;

  const renderBrandLogo = () => {
    return (
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <CardNetworkLogo network={effectiveNetwork} size={28} monochrome={false} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. VISUAL CARD FACE (CRED / Apple Wallet inspired) */}
      <View
        style={[
          styles.walletCardOuter,
          {
            backgroundColor: gradTheme.start,
            shadowColor: gradTheme.shadow,
          },
        ]}
      >
        <View style={styles.walletCard}>
          {/* SVG Linear Gradient Layer */}
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="details_card_grad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={gradTheme.start} stopOpacity="1" />
                <Stop offset="1" stopColor={gradTheme.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx={20} fill="url(#details_card_grad)" />
          </Svg>

          {/* Top Row: Title & Brand */}
          <View style={styles.topRow}>
            <View style={styles.chipRow}>
              <View style={styles.emvChip}>
                <View style={styles.emvCircuitLineH} />
                <View style={styles.emvCircuitLineV} />
                <View style={styles.emvCenterCore} />
              </View>
              <Radio size={16} color="rgba(255, 255, 255, 0.7)" style={styles.contactlessIcon} />
              <Text style={styles.cardTitleText} numberOfLines={1}>
                {cardTitle}
              </Text>
              {isLast4 && (
                <View style={styles.safeBadge}>
                  <ShieldCheck size={11} color="#34C759" strokeWidth={2.6} />
                  <Text style={styles.safeBadgeText}>Safe 4</Text>
                </View>
              )}
            </View>
            {renderBrandLogo()}
          </View>

          {/* Card Number */}
          <View style={styles.numberRow}>
            <Text
              style={[
                styles.cardNumberText,
                showNumber && styles.cardNumberTextRevealed,
              ]}
              numberOfLines={1}
            >
              {currentDisplayNumber}
            </Text>
            <View style={styles.cardActionGroup}>
              <TouchableOpacity
                onPress={handleToggleNumber}
                style={styles.cardActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                accessibilityLabel="Toggle card number visibility"
              >
                {showNumber ? <EyeOff color="#FFFFFF" size={16} /> : <Eye color="#FFFFFF" size={16} />}
              </TouchableOpacity>
              {card.cardNumber && (
                <TouchableOpacity
                  onPress={handleCopyNumber}
                  style={[
                    styles.cardActionBtn,
                    copiedField === 'card' && styles.cardActionBtnSuccess,
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Copy card number"
                >
                  {copiedField === 'card' ? (
                    <Check color="#34C759" size={16} strokeWidth={2.8} />
                  ) : (
                    <Copy color="#FFFFFF" size={16} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom Card Row (Holder & Expiry) */}
          <View style={styles.bottomRow}>
            <View style={styles.holderBlock}>
              <Text style={styles.metaLabel}>CARDHOLDER</Text>
              <Text style={styles.holderNameText} numberOfLines={1}>
                {(card.cardholderName || 'CARDHOLDER').toUpperCase()}
              </Text>
            </View>

            <View style={styles.expiryBlock}>
              <Text style={styles.metaLabel}>EXPIRES</Text>
              <Text style={styles.expiryText}>
                {card.expiryDate || 'MM/YY'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. SECURITY DETAILS BELOW CARD (CVV & PIN with copy) */}
      <View style={styles.securityGrid}>
        {card.cvv ? (
          <View style={styles.secBox}>
            <View style={styles.secInfo}>
              <Text style={styles.secLabel}>SECURITY CODE (CVV)</Text>
              <Text style={styles.secValue}>
                {showCvv ? card.cvv : '•••'}
              </Text>
            </View>
            <View style={styles.secActions}>
              <TouchableOpacity
                onPress={handleToggleCvv}
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                accessibilityLabel="Toggle CVV visibility"
              >
                {showCvv ? <EyeOff color="#8E8E93" size={18} /> : <Eye color="#8E8E93" size={18} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCopyCvv}
                style={[
                  styles.iconBtn,
                  copiedField === 'cvv' && styles.iconBtnSuccess,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                accessibilityLabel="Copy CVV"
              >
                {copiedField === 'cvv' ? (
                  <Check color="#34C759" size={18} strokeWidth={2.6} />
                ) : (
                  <Copy color="#007AFF" size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {card.pin ? (
          <View style={styles.secBox}>
            <View style={styles.secInfo}>
              <Text style={styles.secLabel}>ATM PIN</Text>
              <Text style={styles.secValue}>
                {showPin ? card.pin : '••••'}
              </Text>
            </View>
            <View style={styles.secActions}>
              <TouchableOpacity
                onPress={handleTogglePin}
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                accessibilityLabel="Toggle PIN visibility"
              >
                {showPin ? <EyeOff color="#8E8E93" size={18} /> : <Eye color="#8E8E93" size={18} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCopyPin}
                style={[
                  styles.iconBtn,
                  copiedField === 'pin' && styles.iconBtnSuccess,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                accessibilityLabel="Copy PIN"
              >
                {copiedField === 'pin' ? (
                  <Check color="#34C759" size={18} strokeWidth={2.6} />
                ) : (
                  <Copy color="#007AFF" size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {!onRequireAuth && localAuth.AuthModal}
    </View>
  );
};

export default CreditCardView;

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  walletCardOuter: {
    width: '100%',
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 6,
  },
  walletCard: {
    borderRadius: 20,
    padding: 20,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  emvChip: {
    width: 34,
    height: 25,
    borderRadius: 5,
    backgroundColor: '#E5C058',
    borderWidth: 1,
    borderColor: '#C49B28',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvCircuitLineH: {
    position: 'absolute',
    top: 11,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#9E7812',
  },
  emvCircuitLineV: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#9E7812',
  },
  emvCenterCore: {
    width: 12,
    height: 9,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#9E7812',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactlessIcon: {
    transform: [{ rotate: '90deg' }],
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52, 199, 89, 0.4)',
    gap: 3,
  },
  safeBadgeText: {
    color: '#F2F2F7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Brand Logos
  mastercardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  visaLogoText: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  amexLogoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  amexLogoText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  genericBrandBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  genericBrandText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  // Number Row
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  cardNumberText: {
    fontSize: 16.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    flex: 1,
    marginRight: 8,
  },
  cardNumberTextRevealed: {
    letterSpacing: 1.5,
  },
  cardActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  cardActionBtnSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.35)',
    borderColor: '#34C759',
  },
  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holderBlock: {
    flex: 1,
    marginRight: 14,
  },
  metaLabel: {
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  holderNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  expiryBlock: {
    alignItems: 'flex-end',
  },
  expiryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },

  // --- Security Details Grid Below Card ---
  securityGrid: {
    marginTop: 12,
    gap: 10,
  },
  secBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  secInfo: {
    flex: 1,
  },
  secLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  secValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1.2,
  },
  secActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnSuccess: {
    backgroundColor: '#DCFCE7',
  },
});
