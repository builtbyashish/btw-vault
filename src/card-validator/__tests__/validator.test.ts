import { validateLuhn } from '../luhn';
import { normalizeCardNumber } from '../normalize';
import { detectCardNetwork } from '../detect-network';
import { validateCardNumber } from '../validate-card';
import { formatCardNumber } from '../format-card';

export function runCardValidatorTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${desc}`);
    }
  }

  // 1. Luhn Checksum Tests
  assert(validateLuhn('79927398713') === true, 'Valid Luhn sample 79927398713');
  assert(validateLuhn('79927398714') === false, 'Invalid Luhn sample 79927398714');
  assert(validateLuhn('49927398716') === true, 'Valid Luhn sample 49927398716');
  assert(validateLuhn('') === false, 'Empty string fails Luhn');
  assert(validateLuhn('1') === false, 'Single digit fails Luhn');

  // 2. Normalization Tests
  const norm1 = normalizeCardNumber('4209 1234 5678 9012');
  assert(norm1.normalized === '4209123456789012' && !norm1.hasInvalidChars, 'Normalizes spaces');
  const norm2 = normalizeCardNumber('4209-1234-5678-9012');
  assert(norm2.normalized === '4209123456789012' && !norm2.hasInvalidChars, 'Normalizes hyphens');
  const norm3 = normalizeCardNumber('4209 1234 ABCD 9012');
  assert(norm3.hasInvalidChars === true, 'Detects invalid letters');

  // 3. Network Detection Tests
  // Visa (starts with 4)
  assert(detectCardNetwork('4209').network === 'visa', 'Detects Visa');

  // Mastercard (51-55 or 2221-2720)
  assert(detectCardNetwork('5100').network === 'mastercard', 'Detects Mastercard 5-series');
  assert(detectCardNetwork('2221').network === 'mastercard', 'Detects Mastercard 2-series');

  // Amex (34, 37)
  assert(detectCardNetwork('3400').network === 'amex', 'Detects Amex 34');
  assert(detectCardNetwork('3782').network === 'amex', 'Detects Amex 37');

  // Discover (6011, 65, 644)
  assert(detectCardNetwork('6011').network === 'discover', 'Detects Discover 6011');
  assert(detectCardNetwork('650000').network === 'discover', 'Detects Discover 65');

  // JCB (3528-3589)
  assert(detectCardNetwork('3528').network === 'jcb', 'Detects JCB');

  // UnionPay (62, 81)
  assert(detectCardNetwork('6200').network === 'unionpay', 'Detects UnionPay 62');

  // RuPay (60, 6521, 508)
  assert(detectCardNetwork('652150').network === 'rupay', 'Detects RuPay 652150');
  assert(detectCardNetwork('5080').network === 'rupay', 'Detects RuPay 508');

  // Diners Club (300-305, 36, 38)
  assert(detectCardNetwork('3000').network === 'diners-club', 'Detects Diners Club 300');
  assert(detectCardNetwork('3600').network === 'diners-club', 'Detects Diners Club 36');

  // Maestro (5018, 5020, 5893, 6759)
  assert(detectCardNetwork('5018').network === 'maestro', 'Detects Maestro 5018');
  assert(detectCardNetwork('6759').network === 'maestro', 'Detects Maestro 6759');

  // Elo (Brazil: 401178, 5067, 650485)
  assert(detectCardNetwork('401178').network === 'elo', 'Detects Elo (precedence over Visa 4)');
  assert(detectCardNetwork('504175').network === 'elo', 'Detects Elo 504175');
  assert(detectCardNetwork('650485').network === 'elo', 'Detects Elo 650485');

  // Mir (2200-2204)
  assert(detectCardNetwork('2200').network === 'mir', 'Detects Mir');

  // Troy (Turkey: 9792)
  assert(detectCardNetwork('9792').network === 'troy', 'Detects Troy');

  // Bancontact (6703)
  assert(detectCardNetwork('6703').network === 'bancontact', 'Detects Bancontact');

  // Unknown
  assert(detectCardNetwork('1111').network === 'unknown', 'Detects unknown network safely');

  // 4. Overlapping Precedence Tests
  // Elo 401178 must beat Visa 4
  const eloOverVisa = detectCardNetwork('4011781234567890');
  assert(eloOverVisa.network === 'elo', 'Elo takes precedence over Visa on 401178');

  // Regular Visa 4209 must be Visa
  const regularVisa = detectCardNetwork('4209123456789012');
  assert(regularVisa.network === 'visa', 'Regular 4xxx is detected as Visa');

  // RuPay 652150 must beat Discover 65
  const rupayOverDiscover = detectCardNetwork('6521501234567890');
  assert(rupayOverDiscover.network === 'rupay', 'RuPay takes precedence over Discover on 652150');

  // 5. Partial Typing Detection Tests
  const partial3 = detectCardNetwork('3');
  assert(partial3.possibleNetworks.includes('amex'), 'Partial "3" includes Amex in possibleNetworks');
  assert(partial3.possibleNetworks.includes('diners-club'), 'Partial "3" includes Diners in possibleNetworks');
  assert(partial3.isConfirmed === false, 'Partial "3" is not confirmed');

  // 6. Formatting Tests
  // Amex: 4-6-5
  const amexFormatted = formatCardNumber('378282246310005', 'amex');
  assert(amexFormatted === '3782 822463 10005', 'Amex formatted as 4-6-5');

  // Visa: 4-4-4-4
  const visaFormatted = formatCardNumber('4209123456789012', 'visa');
  assert(visaFormatted === '4209 1234 5678 9012', 'Visa formatted as 4-4-4-4');

  // 7. Full Validation Function Tests
  const emptyRes = validateCardNumber('');
  assert(emptyRes.errors.includes('EMPTY'), 'Empty number returns EMPTY error');

  const invalidCharsRes = validateCardNumber('4209-1234-ABCD-9012');
  assert(invalidCharsRes.errors.includes('INVALID_CHARACTERS'), 'Returns INVALID_CHARACTERS');

  // 8. Complete & Valid Card Tests (Synthetic test numbers with valid Luhn)
  // Synthetic Visa: 4000000000000002
  assert(validateLuhn('4000000000000002') === true, 'Valid synthetic Visa passes Luhn');
  const validVisaRes = validateCardNumber('4000 0000 0000 0002');
  assert(validVisaRes.isValid === true, 'Valid Visa returns isValid === true');
  assert(validVisaRes.isComplete === true, 'Valid Visa is complete');
  assert(validVisaRes.checksumValid === true, 'Valid Visa checksumValid is true');
  assert(validVisaRes.network === 'visa', 'Valid Visa network is visa');

  // Synthetic Visa with bad check digit: 4000000000000003
  const badVisaRes = validateCardNumber('4000 0000 0000 0003');
  assert(badVisaRes.isValid === false, 'Bad check digit fails isValid');
  assert(badVisaRes.checksumValid === false, 'Bad check digit checksumValid is false');
  assert(badVisaRes.errors.includes('INVALID_CHECKSUM'), 'Bad check digit returns INVALID_CHECKSUM error');

  // Synthetic Amex (15 digits): 378282246310005
  assert(validateLuhn('378282246310005') === true, 'Valid synthetic Amex passes Luhn');
  const validAmexRes = validateCardNumber('3782 822463 10005');
  assert(validAmexRes.network === 'amex', 'Valid Amex network is amex');
  assert(validAmexRes.isValid === true, 'Valid Amex is valid');
  assert(validAmexRes.isComplete === true, 'Valid Amex is complete');

  // Diners Club 14-digit formatting and detection: 36000000000008
  assert(validateLuhn('36000000000008') === true, 'Diners 14-digit passes Luhn');
  const dinersFormatted = formatCardNumber('36000000000008', 'diners-club');
  assert(dinersFormatted === '3600 000000 0008', 'Diners 14 formatted as 4-6-4');
  const validDinersRes = validateCardNumber('36000000000008');
  assert(validDinersRes.network === 'diners-club', 'Detects Diners Club');
  assert(validDinersRes.isValid === true, 'Valid 14-digit Diners is valid');

  // 9. Leading zeros handling
  const leadingZero = normalizeCardNumber('0420 1234');
  assert(leadingZero.normalized === '04201234', 'Preserves leading zeros in normalization');

  // 10. Unknown card with valid Luhn fails network check safely
  // 1000000000000008 (unknown prefix '1', length 16, passes Luhn)
  assert(validateLuhn('1000000000000008') === true, 'Synthetic unknown passes Luhn');
  const unknownCardRes = validateCardNumber('1000 0000 0000 0008');
  assert(unknownCardRes.network === 'unknown', 'Unknown prefix returns network unknown');
  assert(unknownCardRes.errors.includes('UNKNOWN_NETWORK'), 'Returns UNKNOWN_NETWORK error');
  assert(unknownCardRes.isValid === false, 'Unknown card isValid is false even if Luhn passes');

  return { passed, failed, errors };
}
