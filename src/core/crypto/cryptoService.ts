import { argon2id } from '@noble/hashes/argon2';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { gcm } from '@noble/ciphers/aes';
import { EncryptedPayload, VaultItem } from '../../types';

const VERIFICATION_TOKEN = 'OFFLINE_VAULT_VERIFY_TOKEN_V1';

// Convert Uint8List/Uint8Array to Base64 and vice versa
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function getRandomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-crypto').getRandomBytes(length);
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto');
    return new Uint8Array(nodeCrypto.randomBytes(length));
  }
}

export class CryptoService {
  /**
   * Generates cryptographically secure random bytes
   */
  static getRandomBytes(length: number): Uint8Array {
    return getRandomBytes(length);
  }

  /**
   * Asynchronously derives a 256-bit (32-byte) key from password & salt using Argon2id
   * Yields to UI thread before heavy derivation to keep UI smooth.
   */
  static async deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    // Yield execution to allow React state updates (e.g. spinner) to render on screen
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      // Argon2id mobile JS parameters: 4MB memory (4096 KB), 2 iterations, 1 lane
      return argon2id(stringToBytes(password), salt, {
        t: 2,
        m: 4096,
        p: 1,
        dkLen: 32,
      });
    } catch (e) {
      console.warn('Argon2id fallback to PBKDF2:', e);
      // High iteration PBKDF2-SHA256 fallback if memory allocation fails on device
      return pbkdf2(sha256, password, salt, { c: 25000, dkLen: 32 });
    }
  }

  /**
   * Encrypts plaintext string using AES-256-GCM with a derived master key
   */
  static encrypt(plaintext: string, masterKey: Uint8Array, salt: Uint8Array): EncryptedPayload {
    const iv = getRandomBytes(12); // 96-bit IV for AES-GCM
    const cipher = gcm(masterKey, iv);
    
    const plaintextBytes = stringToBytes(plaintext);
    const fullCiphertext = cipher.encrypt(plaintextBytes);
    
    // @noble/ciphers gcm returns ciphertext + 16-byte auth tag concatenated at the end
    const tagLength = 16;
    const ciphertextBytes = fullCiphertext.subarray(0, fullCiphertext.length - tagLength);
    const tagBytes = fullCiphertext.subarray(fullCiphertext.length - tagLength);

    return {
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertextBytes),
      tag: bytesToBase64(tagBytes),
    };
  }

  /**
   * Decrypts an EncryptedPayload using AES-256-GCM and the master key
   */
  static decrypt(payload: EncryptedPayload, masterKey: Uint8Array): string {
    const iv = base64ToBytes(payload.iv);
    const ciphertext = base64ToBytes(payload.ciphertext);
    const tag = base64ToBytes(payload.tag);

    // Concatenate ciphertext and tag for @noble/ciphers gcm decrypt
    const fullCiphertext = new Uint8Array(ciphertext.length + tag.length);
    fullCiphertext.set(ciphertext, 0);
    fullCiphertext.set(tag, ciphertext.length);

    const cipher = gcm(masterKey, iv);
    const decryptedBytes = cipher.decrypt(fullCiphertext);
    return bytesToString(decryptedBytes);
  }

  /**
   * Generates encrypted verification payload during setup
   */
  static createVerificationToken(masterKey: Uint8Array, salt: Uint8Array): EncryptedPayload {
    return CryptoService.encrypt(VERIFICATION_TOKEN, masterKey, salt);
  }

  /**
   * Verifies master key candidate against stored verification payload
   */
  static verifyMasterKey(masterKeyCandidate: Uint8Array, verificationPayload: EncryptedPayload): boolean {
    try {
      const decrypted = CryptoService.decrypt(verificationPayload, masterKeyCandidate);
      return decrypted === VERIFICATION_TOKEN;
    } catch {
      return false;
    }
  }

  /**
   * Encrypts list of VaultItems to EncryptedPayload
   */
  static encryptVaultItems(items: VaultItem[], masterKey: Uint8Array, salt: Uint8Array): EncryptedPayload {
    const jsonStr = JSON.stringify(items);
    return CryptoService.encrypt(jsonStr, masterKey, salt);
  }

  /**
   * Decrypts EncryptedPayload to list of VaultItems
   */
  static decryptVaultItems(payload: EncryptedPayload, masterKey: Uint8Array): VaultItem[] {
    const jsonStr = CryptoService.decrypt(payload, masterKey);
    return JSON.parse(jsonStr) as VaultItem[];
  }

  /**
   * Zero out sensitive Uint8Array in memory
   */
  static wipeBytes(bytes: Uint8Array | null | undefined): void {
    if (bytes) {
      bytes.fill(0);
    }
  }
}
