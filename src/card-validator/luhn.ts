/**
 * Luhn (Mod 10) Checksum Algorithm
 * Pure function with zero runtime dependencies.
 *
 * Algorithm:
 * 1. Starting from the rightmost digit (check digit) and moving left:
 * 2. Double the value of every second digit.
 * 3. If doubling results in a number > 9, subtract 9 (or add the digits).
 * 4. Sum all digits.
 * 5. If the total modulo 10 equals 0, the number is valid.
 */
export function validateLuhn(digits: string): boolean {
  if (!digits || digits.length < 2) {
    return false;
  }

  // Reject non-digits
  if (!/^\d+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let isSecond = false;

  // Process digits from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isSecond) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isSecond = !isSecond;
  }

  return sum % 10 === 0;
}
