import { CardNetwork, CardNetworkDefinition } from './types';
import { CARD_NETWORK_DEFINITIONS, UNKNOWN_NETWORK_DEFINITION } from './network-definitions';
import { normalizeCardNumber } from './normalize';

export interface DetectionResult {
  network: CardNetwork;
  definition: CardNetworkDefinition;
  isConfirmed: boolean;
  possibleNetworks: CardNetwork[];
}

/**
 * Checks if a partial digit string could fall within [start, end].
 */
function isPartialMatch(digits: string, start: string, end: string): boolean {
  if (digits.length === 0) return true;
  if (digits.length >= start.length) {
    const sub = digits.slice(0, start.length);
    return sub >= start && sub <= end;
  }
  const startSub = start.slice(0, digits.length);
  const endSub = end.slice(0, digits.length);
  return digits >= startSub && digits <= endSub;
}

/**
 * Checks if digits have a full confirmed prefix match for [start, end].
 */
function isConfirmedPrefixMatch(digits: string, start: string, end: string): boolean {
  if (digits.length < start.length) return false;
  const prefix = digits.slice(0, start.length);
  return prefix >= start && prefix <= end;
}

/**
 * Detects the card network from a raw or normalized card number.
 * Returns the best network match, its definition, confirmed flag, and possible networks.
 */
export function detectCardNetwork(rawCardNumber: string): DetectionResult {
  const { normalized } = normalizeCardNumber(rawCardNumber);

  if (!normalized) {
    return {
      network: 'unknown',
      definition: UNKNOWN_NETWORK_DEFINITION,
      isConfirmed: false,
      possibleNetworks: [],
    };
  }

  const confirmedMatches: { def: CardNetworkDefinition; matchLength: number }[] = [];
  const possibleMatches: { def: CardNetworkDefinition; matchLength: number }[] = [];

  for (const def of CARD_NETWORK_DEFINITIONS) {
    let bestMatchLength = 0;
    let isConfirmed = false;

    for (const range of def.iinRanges) {
      if (isConfirmedPrefixMatch(normalized, range.start, range.end)) {
        if (range.start.length > bestMatchLength) {
          bestMatchLength = range.start.length;
          isConfirmed = true;
        }
      } else if (!isConfirmed && isPartialMatch(normalized, range.start, range.end)) {
        if (normalized.length > bestMatchLength) {
          bestMatchLength = normalized.length;
        }
      }
    }

    if (isConfirmed) {
      confirmedMatches.push({ def, matchLength: bestMatchLength });
    } else if (bestMatchLength > 0) {
      possibleMatches.push({ def, matchLength: bestMatchLength });
    }
  }

  // Precedence Rule:
  // 1. Confirmed matches sorted by longest prefix first (e.g. 6-digit Elo beats 1-digit Visa)
  // 2. If tie in length, preserves defined network order
  if (confirmedMatches.length > 0) {
    confirmedMatches.sort((a, b) => b.matchLength - a.matchLength);
    const best = confirmedMatches[0].def;
    const possibleNetworks = confirmedMatches.map((m) => m.def.id);

    return {
      network: best.id,
      definition: best,
      isConfirmed: true,
      possibleNetworks,
    };
  }

  // If only possible (partial) matches exist
  if (possibleMatches.length > 0) {
    possibleMatches.sort((a, b) => b.matchLength - a.matchLength);
    const best = possibleMatches[0].def;
    const possibleNetworks = possibleMatches.map((m) => m.def.id);

    return {
      network: best.id,
      definition: best,
      isConfirmed: false,
      possibleNetworks,
    };
  }

  return {
    network: 'unknown',
    definition: UNKNOWN_NETWORK_DEFINITION,
    isConfirmed: false,
    possibleNetworks: [],
  };
}
