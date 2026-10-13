import React from 'react';
import { Text, StyleSheet, TextStyle, Platform } from 'react-native';

interface BtwVaultLogoProps {
  size?: number;
  color?: string;
  style?: TextStyle;
}

/**
 * BtwVaultLogo
 *
 * A modern, typography-first text wordmark inspired by top-tier modern apps (Instagram, Threads, Linear).
 * Uses pure text geometry with distinctive weight contrast:
 * "btw" in modern geometric medium weight + "vault" in bold punchy weight.
 */
export const BtwVaultLogo: React.FC<BtwVaultLogoProps> = ({
  size = 26,
  color = '#000000',
  style,
}) => {
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.15),
          color,
        },
        style,
      ]}
      accessibilityRole="header"
      accessibilityLabel="btw vault"
    >
      <Text style={styles.btw}>btw </Text>
      <Text style={styles.vault}>vault</Text>
    </Text>
  );
};

export default BtwVaultLogo;

const styles = StyleSheet.create({
  base: {
    fontFamily: Platform.select({
      ios: 'Outfit',
      android: 'Outfit',
      default: 'Outfit',
    }),
    letterSpacing: -1,
    includeFontPadding: false,
  },
  btw: {
    fontWeight: '500',
  },
  vault: {
    fontWeight: '700',
  },
});
