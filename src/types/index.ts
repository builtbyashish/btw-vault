export type ItemCategory = 'login' | 'card' | 'note' | 'other';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'link'
  | 'url'
  | 'date'
  | 'time'
  | 'email'
  | 'hidden';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: CustomFieldType;
}

export interface NoteSection {
  id: string;
  title?: string;
  content: string;
}

import { CardNetwork } from '../card-validator/types';

export interface CardDetails {
  cardholderName?: string;
  cardNumber?: string;
  expiryDate?: string; // MM/YY
  cvv?: string;
  pin?: string;
  cardBrand?: CardNetwork | 'other';
}

export interface VaultItem {
  id: string;
  title: string;
  category: ItemCategory;
  tags?: string[];
  notes?: string;
  isPinned?: boolean;
  color?: string;

  // 1. Login specific
  username?: string;
  password?: string;
  url?: string;
  additionalUrls?: string[];

  // 2. Secure Notes specific
  noteSections?: NoteSection[];

  // 3. Card specific
  cardDetails?: CardDetails;

  // Legacy fallback if previous DB had document field
  document?: any;

  // 4. Custom extensible fields (Predefined text, number, date, time, url, etc.)
  customFields: CustomField[];
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedPayload {
  salt: string;        // Base64
  iv: string;          // Base64
  ciphertext: string;  // Base64
  tag: string;         // Base64
}

export interface VaultConfig {
  salt: string;
  verification: EncryptedPayload;
  biometricEnabled: boolean;
  autoLockMinutes: number;
  updatedAt: string;
}

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked' | 'authenticating';
