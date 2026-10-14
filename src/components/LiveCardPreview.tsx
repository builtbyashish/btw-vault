import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Radio } from 'lucide-react-native';
import { CardNetwork } from '../card-validator/types';
import { CardNetworkLogo } from '../card-validator/logos';
import { resolveCardTheme } from '../card-validator/theme';

export interface LiveCardPreviewProps {
  title?: string;
  cardNumber?: string;
  cardNumberType?: 'full' | 'last4';
  cardholderName?: string;
  expiryDate?: string;
  network?: CardNetwork | 'other' | string;
}

export const LiveCardPreview: React.FC<LiveCardPreviewProps> = ({
  title,
  cardNumber = '',
  cardNumberType = 'last4',
  cardholderName = '',
  expiryDate = '',
  network = 'unknown',
}) => {
  const theme = resolveCardTheme(network, cardNumber);
  const gradientColors = [theme.start, theme.end];
  const displayTitle = title?.trim() || theme.name || 'Card';

  // Format card number display
  const rawClean = cardNumber.replace(/\s+/g, '');
  let displayCardNumber = '••••  ••••  ••••  ••••';

  const isLast4 = cardNumberType === 'last4' || (rawClean.length > 0 && rawClean.length <= 4 && cardNumberType !== 'full');

  if (isLast4) {
    const p4 = rawClean ? rawClean.padEnd(4, '•') : '••••';
    displayCardNumber = `••••  ••••  ••••  ${p4}`;
  } else if (rawClean.length > 0) {
    if (network === 'amex') {
      // 4-6-5 format
      const p1 = rawClean.slice(0, 4).padEnd(4, '•');
      const p2 = rawClean.length > 4 ? rawClean.slice(4, 10).padEnd(6, '•') : '••••••';
      const p3 = rawClean.length > 10 ? rawClean.slice(10, 15).padEnd(5, '•') : '•••••';
      displayCardNumber = `${p1}  ${p2}  ${p3}`;
    } else if (network === 'diners-club' && rawClean.length <= 14) {
      // 4-6-4 format
      const p1 = rawClean.slice(0, 4).padEnd(4, '•');
      const p2 = rawClean.length > 4 ? rawClean.slice(4, 10).padEnd(6, '•') : '••••••';
      const p3 = rawClean.length > 10 ? rawClean.slice(10, 14).padEnd(4, '•') : '••••';
      displayCardNumber = `${p1}  ${p2}  ${p3}`;
    } else {
      // Standard 4-4-4-4
      const p1 = rawClean.slice(0, 4).padEnd(4, '•');
      const p2 = rawClean.length > 4 ? rawClean.slice(4, 8).padEnd(4, '•') : '••••';
      const p3 = rawClean.length > 8 ? rawClean.slice(8, 12).padEnd(4, '•') : '••••';
      const p4 = rawClean.length > 12 ? rawClean.slice(12, 16).padEnd(4, '•') : '••••';
      displayCardNumber = `${p1}  ${p2}  ${p3}  ${p4}`;
      if (rawClean.length > 16) {
        displayCardNumber += `  ${rawClean.slice(16, 19)}`;
      }
    }
  }

  const displayName = cardholderName.trim()
    ? cardholderName.trim().toUpperCase()
    : 'CARDHOLDER NAME';

  const displayExpiry = expiryDate.trim() ? expiryDate.trim() : 'MM/YY';

  return (
    <View style={[styles.outerContainer, { shadowColor: theme.shadow }]}>
      <View style={[styles.cardContainer, { backgroundColor: gradientColors[0] }]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="live_card_preview_grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="1" stopColor={gradientColors[1]} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={18} fill="url(#live_card_preview_grad)" />
        </Svg>

        {/* Top Row: EMV Chip + Wave + Bank/Card Title + Network Logo */}
        <View style={styles.topRow}>
          <View style={styles.chipCluster}>
            <View style={styles.emvChip}>
              <View style={styles.emvCircuitLineH} />
              <View style={styles.emvCircuitLineV} />
              <View style={styles.emvCenterCore} />
            </View>
            <Radio size={14} color="rgba(255, 255, 255, 0.75)" style={styles.contactlessIcon} />
            <Text style={styles.titleText} numberOfLines={1}>
              {displayTitle}
            </Text>
          </View>
          <View style={styles.logoBadgeContainer}>
            <CardNetworkLogo network={theme.effectiveNetwork} size={24} monochrome={false} />
          </View>
        </View>

        {/* Middle: Live Card Number */}
        <View style={styles.numberRow}>
          <Text style={styles.numberText} numberOfLines={1}>
            {displayCardNumber}
          </Text>
        </View>

        {/* Bottom Row: Cardholder & Expiry */}
        <View style={styles.bottomRow}>
          <View style={styles.holderBlock}>
            <Text style={styles.labelSub}>CARDHOLDER</Text>
            <Text style={styles.holderText} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          <View style={styles.expiryBlock}>
            <Text style={styles.labelSub}>EXPIRES</Text>
            <Text style={styles.expiryText}>{displayExpiry}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  cardContainer: {
    width: '100%',
    aspectRatio: 1.62,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  emvChip: {
    width: 32,
    height: 23,
    borderRadius: 4,
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
    top: 10,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#9E7812',
  },
  emvCircuitLineV: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#9E7812',
  },
  emvCenterCore: {
    width: 11,
    height: 8,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#9E7812',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactlessIcon: {
    transform: [{ rotate: '90deg' }],
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
  logoBadgeContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  numberRow: {
    marginVertical: 4,
  },
  numberText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holderBlock: {
    flex: 1,
    marginRight: 12,
  },
  expiryBlock: {
    alignItems: 'flex-end',
  },
  labelSub: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  holderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  expiryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
