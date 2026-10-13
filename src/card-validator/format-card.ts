import { CardNetwork } from './types';
import { CARD_NETWORK_DEFINITIONS, UNKNOWN_NETWORK_DEFINITION } from './network-definitions';
import { normalizeCardNumber } from './normalize';

/**
 * Formats a card number with network-specific gaps as the user types.
 * e.g. Amex: 4-6-5 (`XXXX XXXXXX XXXXX`)
 * e.g. Diners 14: 4-6-4 (`XXXX XXXXXX XXXX`)
 * e.g. Standard 16: 4-4-4-4 (`XXXX XXXX XXXX XXXX`)
 */
export function formatCardNumber(
  rawCardNumber: string,
  network: CardNetwork = 'unknown'
): string {
  const { normalized } = normalizeCardNumber(rawCardNumber);
  if (!normalized) return '';

  const def =
    CARD_NETWORK_DEFINITIONS.find((d) => d.id === network) ||
    UNKNOWN_NETWORK_DEFINITION;

  const maxLen = Math.max(...def.allowedLengths);
  const truncated = normalized.slice(0, maxLen);

  // Amex: 4-6-5
  if (def.id === 'amex') {
    const p1 = truncated.slice(0, 4);
    const p2 = truncated.slice(4, 10);
    const p3 = truncated.slice(10, 15);

    const parts = [p1, p2, p3].filter((p) => p.length > 0);
    return parts.join(' ');
  }

  // Diners Club 14: 4-6-4
  if (def.id === 'diners-club' && truncated.length <= 14) {
    const p1 = truncated.slice(0, 4);
    const p2 = truncated.slice(4, 10);
    const p3 = truncated.slice(10, 14);

    const parts = [p1, p2, p3].filter((p) => p.length > 0);
    return parts.join(' ');
  }

  // Default: groups of 4
  const parts: string[] = [];
  for (let i = 0; i < truncated.length; i += 4) {
    parts.push(truncated.slice(i, i + 4));
  }

  return parts.join(' ');
}
