/**
 * AppSecurityService
 * Tracks system-level activities (Biometric prompt, File picker, Folder picker, Share sheet)
 * to prevent false-positive auto-locks or privacy curtain triggers while interacting with OS dialogs.
 */
export class AppSecurityService {
  private static _isSystemActivityActive = false;
  private static _resetTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Mark system activity as active (e.g., Biometrics, DocumentPicker, StorageAccessFramework, Sharing)
   */
  static setSystemActivityActive(active: boolean) {
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }

    if (active) {
      this._isSystemActivityActive = true;
    } else {
      // Grace period of 1000ms to allow AppState to safely transition back to 'active'
      this._resetTimer = setTimeout(() => {
        this._isSystemActivityActive = false;
        this._resetTimer = null;
      }, 1000);
    }
  }

  /**
   * Check if an authorized OS system activity is currently underway
   */
  static isSystemActivityActive(): boolean {
    return this._isSystemActivityActive;
  }
}

export default AppSecurityService;
