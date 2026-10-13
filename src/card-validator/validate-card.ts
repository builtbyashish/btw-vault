import { CardValidationResult, CardValidationError } from './types';
import { normalizeCardNumber } from './normalize';
import { detectCardNetwork } from './detect-network';
import { validateLuhn } from './luhn';

/**
 * Validates a card number according to format, network length, and checksum rules.
 * Pure offline function with deterministic results.
 */
export function validateCardNumber(rawCardNumber: string): CardValidationResult {
  const { normalized, hasInvalidChars } = normalizeCardNumber(rawCardNumber);
  const errors: CardValidationError[] = [];

  if (!normalized && !hasInvalidChars) {
    return {
      network: 'unknown',
      isComplete: false,
      isValidFormat: false,
      checksumValid: null,
      isValid: false,
      possibleNetworks: [],
      errors: ['EMPTY'],
    };
  }

  if (hasInvalidChars) {
    errors.push('INVALID_CHARACTERS');
  }

  const detection = detectCardNetwork(normalized);
  const network = detection.network;
  const definition = detection.definition;
  const possibleNetworks = detection.possibleNetworks;

  if (network === 'unknown') {
    errors.push('UNKNOWN_NETWORK');
  }

  // Length check
  const allowedLengths = definition.allowedLengths;
  const isLengthMatched = allowedLengths.includes(normalized.length);
  const minLength = Math.min(...allowedLengths);
  const maxLength = Math.max(...allowedLengths);

  // Card is considered complete if its length matches an allowed length
  // or reaches/exceeds the network's max allowed length
  const isComplete = isLengthMatched || normalized.length >= maxLength;

  if (isComplete && !isLengthMatched) {
    errors.push('INVALID_LENGTH');
  }

  // Checksum evaluation
  let checksumValid: boolean | null = null;

  if (definition.checksum === 'luhn') {
    if (isComplete && isLengthMatched) {
      const isLuhnOk = validateLuhn(normalized);
      checksumValid = isLuhnOk;
      if (!isLuhnOk) {
        errors.push('INVALID_CHECKSUM');
      }
    } else {
      checksumValid = null;
    }
  }

  const isValidFormat = !hasInvalidChars && /^\d+$/.test(normalized);
  const isValid =
    errors.length === 0 &&
    isComplete &&
    isLengthMatched &&
    (checksumValid === true || definition.checksum !== 'luhn');

  return {
    network,
    isComplete,
    isValidFormat,
    checksumValid,
    isValid,
    possibleNetworks,
    errors,
  };
}
