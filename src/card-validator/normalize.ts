/**
 * Normalizes user card number input:
 * - Strips all spaces and hyphens
 * - Checks for invalid non-digit characters
 */
export function normalizeCardNumber(raw: string): {
  normalized: string;
  hasInvalidChars: boolean;
} {
  if (!raw) {
    return { normalized: '', hasInvalidChars: false };
  }

  // Remove spaces, tabs, dashes, and hyphens
  const stripped = raw.replace(/[\s\-\u2013\u2014]/g, '');

  // Check if remaining characters are digits only
  const hasInvalidChars = /[^\d]/.test(stripped);

  // Extract clean digits
  const normalized = stripped.replace(/[^\d]/g, '');

  return {
    normalized,
    hasInvalidChars,
  };
}
