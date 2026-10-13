import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { base64ToBytes, bytesToBase64 } from '../crypto/cryptoService';

const BIOMETRIC_KEY_TAG = 'offline_vault_biometric_master_key';

export class SecureStorageService {
  /**
   * Securely saves master key in platform Keychain/KeyStore for biometric quick unlock
   */
  static async storeMasterKeyForBiometric(masterKey: Uint8Array): Promise<void> {
    const encoded = bytesToBase64(masterKey);
    await SecureStore.setItemAsync(BIOMETRIC_KEY_TAG, encoded, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  }

  /**
   * Retrieves stored master key from Keychain/KeyStore after successful biometric auth
   */
  static async getMasterKeyForBiometric(): Promise<Uint8Array | null> {
    try {
      const encoded = await SecureStore.getItemAsync(BIOMETRIC_KEY_TAG);
      if (!encoded) return null;
      return base64ToBytes(encoded);
    } catch {
      return null;
    }
  }

  /**
   * Clears biometric key from Keychain/KeyStore
   */
  static async clearBiometricKey(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_TAG);
    } catch {
      // Ignore if not present
    }
  }
}
