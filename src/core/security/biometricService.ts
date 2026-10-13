import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppSecurityService } from './appSecurityService';

export class BiometricService {
  /**
   * Check if hardware supports biometrics and has enrolled biometrics
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user for biometric authentication (Face ID / Touch ID / Fingerprint)
   */
  static async authenticate(reason: string = 'Unlock btw vault'): Promise<boolean> {
    try {
      const available = await BiometricService.isBiometricAvailable();
      if (!available) return false;

      AppSecurityService.setSystemActivityActive(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Master Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch {
      return false;
    } finally {
      AppSecurityService.setSystemActivityActive(false);
    }
  }

  /**
   * Get supported biometric types (Face ID, Touch ID, Fingerprint, Iris)
   */
  static async getSupportedBiometrics(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris Scanner';
      }
      return 'Biometrics';
    } catch {
      return 'Biometrics';
    }
  }
}
