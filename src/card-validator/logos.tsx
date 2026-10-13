import React from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { CardNetwork } from './types';

export type DisplayCardBrand = CardNetwork | 'other';

export interface CardLogoProps {
  network?: CardNetwork | 'other' | string;
  size?: number;
  monochrome?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Offline high-resolution logos from assets/cards/v2/
const V2_CARD_IMAGES: Record<string, any> = {
  visa: require('../../assets/cards/v2/visa.jpeg'),
  vis: require('../../assets/cards/v2/visa.jpeg'),
  mastercard: require('../../assets/cards/v2/mastercard.jpeg'),
  amex: require('../../assets/cards/v2/amex.jpeg'),
  ae: require('../../assets/cards/v2/amex.jpeg'),
  'american-express': require('../../assets/cards/v2/amex.jpeg'),
  rupay: require('../../assets/cards/v2/rupay.jpeg'),
  discover: require('../../assets/cards/v2/discover.jpeg'),
  'diners-club': require('../../assets/cards/v2/diners-club.jpeg'),
  diners: require('../../assets/cards/v2/diners-club.jpeg'),
  'dinner-club': require('../../assets/cards/v2/diners-club.jpeg'),
  jcb: require('../../assets/cards/v2/jcb.jpeg'),
  maestro: require('../../assets/cards/v2/maestro.jpeg'),
  mastero: require('../../assets/cards/v2/maestro.jpeg'),
  unionpay: require('../../assets/cards/v2/unionpay.jpeg'),
};

/**
 * Normalizes card brand strings into standard keys
 */
export function normalizeCardBrandKey(network?: string): string {
  if (!network) return 'other';
  const clean = network.toLowerCase().trim().replace(/[_ ]+/g, '-');
  if (clean === 'vis') return 'visa';
  if (clean === 'ae' || clean === 'american-express') return 'amex';
  if (clean === 'dinner-club' || clean === 'diners') return 'diners-club';
  if (clean === 'mastero') return 'maestro';
  return clean;
}

/**
 * Calculates proportional badge width for each brand so logos remain balanced & legible
 */
function getBadgeWidth(key: string, size: number): number {
  switch (key) {
    case 'diners-club':
    case 'dinner-club':
    case 'diners':
      return Math.round(size * 1.95);
    case 'rupay':
      return Math.round(size * 1.78);
    case 'visa':
    case 'vis':
      return Math.round(size * 1.62);
    case 'amex':
    case 'ae':
      return Math.round(size * 1.55);
    default:
      return Math.round(size * 1.55);
  }
}

export const CardNetworkLogo: React.FC<CardLogoProps> = ({
  network = 'other',
  size = 24,
  monochrome = false,
  style,
}) => {
  const normalizedKey = normalizeCardBrandKey(network);
  const v2Source = V2_CARD_IMAGES[normalizedKey];

  // 1. Render official offline image from assets/cards/v2 when available
  if (v2Source) {
    const width = getBadgeWidth(normalizedKey, size);
    const height = size;
    const borderRadius = Math.max(3, Math.round(size * 0.16));

    return (
      <View
        style={[
          styles.badgeContainer,
          {
            width,
            height,
            borderRadius,
            opacity: monochrome ? 0.75 : 1,
          },
          style,
        ]}
      >
        <Image
          source={v2Source}
          style={styles.badgeImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 2. High-quality vector fallbacks for regional networks and generic placeholder
  const width = Math.round(size * 1.55);
  const height = size;

  switch (normalizedKey) {
    case 'elo':
      return (
        <View style={style}>
          <Svg width={width} height={height} viewBox="0 0 48 32">
            <Rect width="48" height="32" rx="4" fill={monochrome ? 'transparent' : '#00A4E4'} />
            <Circle cx="15" cy="16" r="4.5" fill={monochrome ? '#FFFFFF' : '#EF4123'} />
            <Circle cx="24" cy="16" r="4.5" fill={monochrome ? '#FFFFFF' : '#FFD400'} opacity={monochrome ? 0.7 : 1} />
            <Circle
              cx="33"
              cy="16"
              r="4.5"
              fill={monochrome ? '#FFFFFF' : '#00A4E4'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </Svg>
        </View>
      );

    case 'mir':
      return (
        <View style={style}>
          <Svg width={width} height={height} viewBox="0 0 48 32">
            <Rect width="48" height="32" rx="4" fill={monochrome ? 'transparent' : '#009A51'} />
            <Path
              d="M12 11h3.5l3.5 5.5 3.5-5.5H26v10h-3v-5.5L19.5 21h-1L15 15.5V21h-3V11zm17 0h3v10h-3V11zm6 0h4.5c2 0 3.5 1.5 3.5 3.5 0 1.5-.9 2.7-2.2 3.2l2.7 3.3h-3.8l-2.2-3h-2.5V21h-3V11zm3 2.5v2.5h1.5c.7 0 1.2-.5 1.2-1.2 0-.7-.5-1.3-1.2-1.3H38z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      );

    case 'troy':
      return (
        <View style={style}>
          <Svg width={width} height={height} viewBox="0 0 48 32">
            <Rect width="48" height="32" rx="4" fill={monochrome ? 'transparent' : '#00529B'} />
            <Path
              d="M12 11h9v2.5h-3V21h-3v-7.5h-3V11zm11 0h5c2.5 0 4 1.5 4 3.5 0 1.5-.9 2.7-2.3 3.2l2.8 3.3h-3.8l-2.2-3H26V21h-3V11zm3 2.5v2.5h1.8c.7 0 1.2-.5 1.2-1.2 0-.7-.5-1.3-1.2-1.3H26zm9.5 2.5c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5zm3 0c0 1.5 1 2.5 2 2.5s2-1 2-2.5-1-2.5-2-2.5-2 1-2 2.5z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      );

    case 'bancontact':
      return (
        <View style={style}>
          <Svg width={width} height={height} viewBox="0 0 48 32">
            <Rect width="48" height="32" rx="4" fill={monochrome ? 'transparent' : '#004B87'} />
            <Rect x="8" y="10" width="14" height="12" rx="2" fill={monochrome ? '#FFFFFF' : '#F5A623'} />
            <Rect
              x="26"
              y="10"
              width="14"
              height="12"
              rx="2"
              fill={monochrome ? '#FFFFFF' : '#004B87'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </Svg>
        </View>
      );

    case 'other':
    case 'unknown':
    default:
      return (
        <View style={style}>
          <Svg width={width} height={height} viewBox="0 0 48 32">
            <Rect
              width="48"
              height="32"
              rx="4"
              fill={monochrome ? 'transparent' : '#1E293B'}
              stroke={monochrome ? '#FFFFFF' : '#334155'}
              strokeWidth="1"
            />
            <Rect x="6" y="6" width="36" height="20" rx="3" stroke="#94A3B8" strokeWidth="1.2" />
            <Line x1="6" y1="12" x2="42" y2="12" stroke="#64748B" strokeWidth="1.8" />
            <Rect x="10" y="16" width="6" height="5" rx="1" fill="#F59E0B" />
            <Line
              x1="20"
              y1="18.5"
              x2="36"
              y2="18.5"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2 3"
            />
          </Svg>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  badgeContainer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
});
