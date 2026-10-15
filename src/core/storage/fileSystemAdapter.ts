// Pure React Native / Expo FileSystem Adapter
// Native Expo modules are used on device. Tests inject a FileSystemDriver.

let expoLegacyFs: any = null;
let expoPaths: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoLegacyFs = require('expo-file-system/legacy');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoPaths = require('expo-file-system').Paths;
} catch {
  // Native Expo modules not available in non-native test environments
  expoLegacyFs = null;
  expoPaths = null;
}

export const EncodingType = {
  UTF8: 'utf8' as const,
  Base64: 'base64' as const,
};

export interface FileSystemDriver {
  getPaths(): { document: { uri: string }; cache: { uri: string } };
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number; isDirectory?: boolean }>;
  deleteAsync(uri: string): Promise<void>;
  writeAsStringAsync(
    uri: string,
    content: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<void>;
  readAsStringAsync(
    uri: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<string>;
  moveAsync(options: { from: string; to: string }): Promise<void>;
}

let customDriver: FileSystemDriver | null = null;

export class AppFileSystem {
  /**
   * Injects a custom driver (used for unit / integration tests in Node)
   */
  static setDriver(driver: FileSystemDriver | null): void {
    customDriver = driver;
  }

  static getPaths(): { document: { uri: string }; cache: { uri: string } } {
    if (customDriver) {
      return customDriver.getPaths();
    }
    if (expoPaths) {
      return expoPaths;
    }
    throw new Error('AppFileSystem: Native expo-file-system Paths is unavailable.');
  }

  static async getInfoAsync(
    uri: string
  ): Promise<{ exists: boolean; size?: number; isDirectory?: boolean }> {
    if (customDriver) {
      return await customDriver.getInfoAsync(uri);
    }
    if (expoLegacyFs) {
      return await expoLegacyFs.getInfoAsync(uri);
    }
    throw new Error('AppFileSystem: Native expo-file-system legacy is unavailable.');
  }

  static async deleteAsync(uri: string): Promise<void> {
    if (customDriver) {
      return await customDriver.deleteAsync(uri);
    }
    if (expoLegacyFs) {
      return await expoLegacyFs.deleteAsync(uri);
    }
    throw new Error('AppFileSystem: Native expo-file-system legacy is unavailable.');
  }

  static async writeAsStringAsync(
    uri: string,
    content: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<void> {
    if (customDriver) {
      return await customDriver.writeAsStringAsync(uri, content, options);
    }
    if (expoLegacyFs) {
      return await expoLegacyFs.writeAsStringAsync(uri, content, options);
    }
    throw new Error('AppFileSystem: Native expo-file-system legacy is unavailable.');
  }

  static async readAsStringAsync(
    uri: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<string> {
    if (customDriver) {
      return await customDriver.readAsStringAsync(uri, options);
    }
    if (expoLegacyFs) {
      return await expoLegacyFs.readAsStringAsync(uri, options);
    }
    throw new Error('AppFileSystem: Native expo-file-system legacy is unavailable.');
  }

  static async moveAsync(options: { from: string; to: string }): Promise<void> {
    if (customDriver) {
      return await customDriver.moveAsync(options);
    }
    if (expoLegacyFs) {
      return await expoLegacyFs.moveAsync(options);
    }
    throw new Error('AppFileSystem: Native expo-file-system legacy is unavailable.');
  }
}
