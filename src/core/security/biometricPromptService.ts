import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricService } from './biometricService';

const KEY_JUST_IMPORTED = 'vault_biometric_just_imported';
const KEY_SNOOZE_UNTIL = 'vault_biometric_snooze_until';
const KEY_SKIPPED = 'vault_biometric_skipped';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export class BiometricPromptService {
  /**
   * Called when a backup has been successfully imported to queue the prompt on next unlock
   */
  static async markVaultJustImported(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_JUST_IMPORTED, 'true');
      await AsyncStorage.removeItem(KEY_SNOOZE_UNTIL);
      await AsyncStorage.removeItem(KEY_SKIPPED);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Determines if the biometric setup prompt should be displayed
   */
  static async shouldPromptBiometric(): Promise<boolean> {
    try {
      const isAvailable = await BiometricService.isBiometricAvailable();
      if (!isAvailable) return false;

      // 1. Vault was just imported: always prompt once unlocked
      const justImported = await AsyncStorage.getItem(KEY_JUST_IMPORTED);
      if (justImported === 'true') {
        return true;
      }

      // 2. Check if a snooze has expired
      const snoozeUntilStr = await AsyncStorage.getItem(KEY_SNOOZE_UNTIL);
      if (snoozeUntilStr) {
        const snoozeUntil = parseInt(snoozeUntilStr, 10);
        if (!isNaN(snoozeUntil) && Date.now() >= snoozeUntil) {
          return true;
        }
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * User chose "Remind in 1 Week"
   */
  static async snoozeBiometricForOneWeek(): Promise<void> {
    try {
      const snoozeTarget = Date.now() + ONE_WEEK_MS;
      await AsyncStorage.setItem(KEY_SNOOZE_UNTIL, snoozeTarget.toString());
      await AsyncStorage.removeItem(KEY_JUST_IMPORTED);
      await AsyncStorage.removeItem(KEY_SKIPPED);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * User chose "Skip"
   */
  static async skipBiometricPrompt(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_SKIPPED, 'true');
      await AsyncStorage.removeItem(KEY_JUST_IMPORTED);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clears prompt flags when biometric is enabled or vault wiped
   */
  static async clearBiometricPromptState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEY_JUST_IMPORTED, KEY_SNOOZE_UNTIL, KEY_SKIPPED]);
    } catch {
      // Ignore storage errors
    }
  }
}
