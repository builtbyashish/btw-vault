// Safely load Expo FileSystem on native, or fall back to Node.js fs in testing / Node runtime
let expoLegacyFs: any = null;
let expoPaths: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoLegacyFs = require('expo-file-system/legacy');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoPaths = require('expo-file-system').Paths;
} catch {
  // Native Expo modules not available (Node / test runner)
  expoLegacyFs = null;
  expoPaths = null;
}

export const EncodingType = {
  UTF8: 'utf8' as const,
  Base64: 'base64' as const,
};

export class AppFileSystem {
  private static getNodeFs() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('node:path');
    return { fs, path };
  }

  static getPaths(): { document: { uri: string }; cache: { uri: string } } {
    if (expoPaths) {
      return expoPaths;
    }
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('node:os');
    const { path, fs } = this.getNodeFs();
    const docDir = path.join(os.tmpdir(), 'btwvault_doc');
    const cacheDir = path.join(os.tmpdir(), 'btwvault_cache');

    if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    return {
      document: { uri: `file://${docDir}` },
      cache: { uri: `file://${cacheDir}` },
    };
  }

  static async getInfoAsync(
    uri: string
  ): Promise<{ exists: boolean; size?: number; isDirectory?: boolean }> {
    if (expoLegacyFs) {
      return await expoLegacyFs.getInfoAsync(uri);
    }
    const { fs } = this.getNodeFs();
    const filePath = uri.replace(/^file:\/\//, '');
    try {
      const stats = fs.statSync(filePath);
      return { exists: true, size: stats.size, isDirectory: stats.isDirectory() };
    } catch {
      return { exists: false, isDirectory: false };
    }
  }

  static async deleteAsync(uri: string): Promise<void> {
    if (expoLegacyFs) {
      return await expoLegacyFs.deleteAsync(uri);
    }
    const { fs } = this.getNodeFs();
    const filePath = uri.replace(/^file:\/\//, '');
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore
    }
  }

  static async writeAsStringAsync(
    uri: string,
    content: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<void> {
    if (expoLegacyFs) {
      return await expoLegacyFs.writeAsStringAsync(uri, content, options);
    }
    const { fs, path } = this.getNodeFs();
    const filePath = uri.replace(/^file:\/\//, '');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    fs.writeFileSync(filePath, content, { encoding });
  }

  static async readAsStringAsync(
    uri: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<string> {
    if (expoLegacyFs) {
      return await expoLegacyFs.readAsStringAsync(uri, options);
    }
    const { fs } = this.getNodeFs();
    const filePath = uri.replace(/^file:\/\//, '');
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    return fs.readFileSync(filePath, { encoding });
  }

  static async moveAsync(options: { from: string; to: string }): Promise<void> {
    if (expoLegacyFs) {
      return await expoLegacyFs.moveAsync(options);
    }
    const { fs } = this.getNodeFs();
    const fromPath = options.from.replace(/^file:\/\//, '');
    const toPath = options.to.replace(/^file:\/\//, '');
    fs.renameSync(fromPath, toPath);
  }
}
