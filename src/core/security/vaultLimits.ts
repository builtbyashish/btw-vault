/**
 * Vault Field Limits & Data Sanitization Constants
 *
 * Protects the app from memory spikes, out-of-memory crashes, and excessive storage.
 * Enforces safe boundaries for text inputs, notes, credentials, and imports.
 */

export const VAULT_LIMITS = {
  // Title / Identity
  TITLE_MAX_LEN: 200,
  CARDHOLDER_MAX_LEN: 100,
  TAG_MAX_LEN: 50,
  MAX_TAGS_PER_ITEM: 30,

  // Credentials
  USERNAME_MAX_LEN: 256,
  PASSWORD_MAX_LEN: 500,
  URL_MAX_LEN: 2048,

  // Notes & Text Areas
  // 50,000 characters is ~10,000 words (approx. 20-25 pages of single-spaced text)
  NOTE_MAX_LEN: 50000,
  CHECKLIST_ITEM_MAX_LEN: 1000,
  MAX_CHECKLIST_ITEMS: 200,

  // Custom Fields
  CUSTOM_FIELD_LABEL_MAX_LEN: 100,
  CUSTOM_FIELD_VALUE_MAX_LEN: 1000,
  CUSTOM_FIELD_TEXTAREA_MAX_LEN: 20000, // ~4,000 words for multiline recovery keys/tokens
  CUSTOM_FIELD_KEY_MAX_LEN: 8000, // Sufficient for 4096-bit RSA or multi-line SSH private keys
  MAX_CUSTOM_FIELDS_PER_ITEM: 30,

  // Category Configuration
  CATEGORY_NAME_MAX_LEN: 50,
  CATEGORY_EMOJI_MAX_LEN: 10,

  // Backup Import Safety
  MAX_BACKUP_FILE_BYTES: 25 * 1024 * 1024, // 25 MB max backup file size
} as const;

import { VaultItem, CustomField } from '../../types';

/**
 * Clamps a string to a safe maximum length
 */
export function clampString(str: string | undefined | null, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

/**
 * Sanitizes a custom field's label and value according to its type
 */
export function sanitizeCustomField(field: CustomField): CustomField {
  const maxLen =
    field.type === 'textarea'
      ? VAULT_LIMITS.CUSTOM_FIELD_TEXTAREA_MAX_LEN
      : field.type === 'key'
      ? VAULT_LIMITS.CUSTOM_FIELD_KEY_MAX_LEN
      : VAULT_LIMITS.CUSTOM_FIELD_VALUE_MAX_LEN;

  return {
    ...field,
    label: clampString(field.label, VAULT_LIMITS.CUSTOM_FIELD_LABEL_MAX_LEN),
    value: clampString(field.value, maxLen),
  };
}

/**
 * Sanitizes an entire VaultItem to ensure no single field or collection causes memory exhaustion
 */
export function sanitizeVaultItem(item: VaultItem): VaultItem {
  const sanitized: VaultItem = {
    ...item,
    title: clampString(item.title, VAULT_LIMITS.TITLE_MAX_LEN) || 'Untitled',
    username: item.username ? clampString(item.username, VAULT_LIMITS.USERNAME_MAX_LEN) : undefined,
    password: item.password ? clampString(item.password, VAULT_LIMITS.PASSWORD_MAX_LEN) : undefined,
    url: item.url ? clampString(item.url, VAULT_LIMITS.URL_MAX_LEN) : undefined,
    notes: item.notes ? clampString(item.notes, VAULT_LIMITS.NOTE_MAX_LEN) : undefined,
    additionalUrls: item.additionalUrls
      ? item.additionalUrls.slice(0, 10).map((u) => clampString(u, VAULT_LIMITS.URL_MAX_LEN))
      : undefined,
    tags: item.tags
      ? item.tags.slice(0, VAULT_LIMITS.MAX_TAGS_PER_ITEM).map((t) => clampString(t, VAULT_LIMITS.TAG_MAX_LEN))
      : undefined,
    customFields: item.customFields
      ? item.customFields.slice(0, VAULT_LIMITS.MAX_CUSTOM_FIELDS_PER_ITEM).map(sanitizeCustomField)
      : [],
  };

  if (sanitized.cardDetails) {
    sanitized.cardDetails = {
      ...sanitized.cardDetails,
      cardholderName: sanitized.cardDetails.cardholderName
        ? clampString(sanitized.cardDetails.cardholderName, VAULT_LIMITS.CARDHOLDER_MAX_LEN)
        : undefined,
    };
  }

  return sanitized;
}
