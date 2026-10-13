import {
  CARD_NETWORK_DEFINITIONS,
  UNKNOWN_NETWORK_DEFINITION,
} from './network-definitions';
import { detectCardNetwork } from './detect-network';
import { CardNetwork } from './types';

export interface CardColorTheme {
  id: CardNetwork | 'other' | string;
  name: string;
  start: string;
  end: string;
  shadow: string;
  primaryColor: string;
  effectiveNetwork: CardNetwork | 'other';
}

/**
 * Resolves consistent brand colors, gradients, and effective network identifier
 * across the entire application (Form Preview, Vault Feed, Deck Stack, and Item Details).
 */
export function resolveCardTheme(
  brand?: string,
  cardNumber?: string
): CardColorTheme {
  const rawBrand = (brand || '').toLowerCase().trim();
  let netId = rawBrand;

  // If brand is empty, 'other', or 'unknown', attempt offline detection from card number
  if ((!netId || netId === 'other' || netId === 'unknown') && cardNumber) {
    const rawClean = cardNumber.replace(/\D/g, '');
    if (rawClean.length > 0) {
      const detected = detectCardNetwork(rawClean).network;
      if (detected !== 'unknown') {
        netId = detected;
      }
    }
  }

  const def =
    CARD_NETWORK_DEFINITIONS.find((d) => d.id === netId) ||
    UNKNOWN_NETWORK_DEFINITION;

  const gradients = def.gradientColors || ['#4A5568', '#1A202C'];
  const primary = def.primaryColor || gradients[0];

  const effective = (
    def.id === 'unknown' ? (rawBrand || 'other') : def.id
  ) as CardNetwork | 'other';

  return {
    id: def.id,
    name: def.name,
    start: gradients[0],
    end: gradients[1],
    shadow: primary,
    primaryColor: primary,
    effectiveNetwork: effective,
  };
}
