const STORAGE_KEY_ALLOW_SCREENSHOTS = '@btwvault_allow_screenshots';

// In-memory fallback for test environments or initial load
let _memoryFallback: Record<string, string> = {};

function getAsyncStorage(): typeof import('@react-native-async-storage/async-storage').default | null {
  try {
    // In Node.js unit test runner without React Native native bridge, use fallback
    if (typeof window === 'undefined' && typeof (global as any).nativeCallSyncHook === 'undefined') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
}

function getScreenCaptureModule(): typeof import('expo-screen-capture') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-screen-capture');
  } catch {
    return null;
  }
}

export class ScreenCaptureService {
  /**
   * Check if screenshots are currently allowed by the user.
   * Default is false (security protection active / screenshots blocked).
   */
  static async isScreenshotsAllowed(): Promise<boolean> {
    try {
      const storage = getAsyncStorage();
      let val: string | null = null;
      if (storage) {
        val = await storage.getItem(STORAGE_KEY_ALLOW_SCREENSHOTS);
      } else {
        val = _memoryFallback[STORAGE_KEY_ALLOW_SCREENSHOTS] ?? null;
      }
      return val === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Update screenshot permission.
   * If allowed === true: clears FLAG_SECURE via expo-screen-capture allowScreenCaptureAsync()
   * If allowed === false: sets FLAG_SECURE via expo-screen-capture preventScreenCaptureAsync()
   */
  static async setScreenshotsAllowed(allowed: boolean): Promise<void> {
    try {
      const storage = getAsyncStorage();
      const strVal = allowed ? 'true' : 'false';
      if (storage) {
        await storage.setItem(STORAGE_KEY_ALLOW_SCREENSHOTS, strVal);
      } else {
        _memoryFallback[STORAGE_KEY_ALLOW_SCREENSHOTS] = strVal;
      }

      const captureModule = getScreenCaptureModule();
      if (captureModule) {
        if (allowed) {
          await captureModule.allowScreenCaptureAsync();
        } else {
          await captureModule.preventScreenCaptureAsync();
        }
      }
    } catch (e) {
      console.warn('[ScreenCaptureService] Failed to update screen capture status', e);
    }
  }

  /**
   * Startup sync called on application launch.
   * Ensures FLAG_SECURE is applied by default unless user explicitly allowed screenshots.
   */
  static async syncOnStartup(): Promise<void> {
    try {
      const allowed = await this.isScreenshotsAllowed();
      const captureModule = getScreenCaptureModule();
      if (captureModule) {
        if (allowed) {
          await captureModule.allowScreenCaptureAsync();
        } else {
          await captureModule.preventScreenCaptureAsync();
        }
      }
    } catch (e) {
      console.warn('[ScreenCaptureService] Startup sync error', e);
      try {
        const captureModule = getScreenCaptureModule();
        if (captureModule) {
          await captureModule.preventScreenCaptureAsync();
        }
      } catch {}
    }
  }

  /**
   * Test helper to reset memory fallback state
   */
  static resetMemoryState(): void {
    _memoryFallback = {};
  }
}

export default ScreenCaptureService;
