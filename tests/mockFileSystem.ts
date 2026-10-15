import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AppFileSystem, FileSystemDriver } from '../src/core/storage/fileSystemAdapter';

export class MockFileSystemDriver implements FileSystemDriver {
  private docDir: string;
  private cacheDir: string;

  constructor() {
    this.docDir = path.join(os.tmpdir(), 'btwvault_doc_test');
    this.cacheDir = path.join(os.tmpdir(), 'btwvault_cache_test');
    if (!fs.existsSync(this.docDir)) fs.mkdirSync(this.docDir, { recursive: true });
    if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  getPaths(): { document: { uri: string }; cache: { uri: string } } {
    return {
      document: { uri: `file://${this.docDir}` },
      cache: { uri: `file://${this.cacheDir}` },
    };
  }

  async getInfoAsync(
    uri: string
  ): Promise<{ exists: boolean; size?: number; isDirectory?: boolean }> {
    const filePath = uri.replace(/^file:\/\//, '');
    try {
      const stats = fs.statSync(filePath);
      return { exists: true, size: stats.size, isDirectory: stats.isDirectory() };
    } catch {
      return { exists: false, isDirectory: false };
    }
  }

  async deleteAsync(uri: string): Promise<void> {
    const filePath = uri.replace(/^file:\/\//, '');
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore
    }
  }

  async writeAsStringAsync(
    uri: string,
    content: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<void> {
    const filePath = uri.replace(/^file:\/\//, '');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    fs.writeFileSync(filePath, content, { encoding });
  }

  async readAsStringAsync(
    uri: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ): Promise<string> {
    const filePath = uri.replace(/^file:\/\//, '');
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    return fs.readFileSync(filePath, { encoding });
  }

  async moveAsync(options: { from: string; to: string }): Promise<void> {
    const fromPath = options.from.replace(/^file:\/\//, '');
    const toPath = options.to.replace(/^file:\/\//, '');
    const dir = path.dirname(toPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(fromPath, toPath);
  }
}

// Auto-register driver for test execution
export function initMockFileSystem(): MockFileSystemDriver {
  const driver = new MockFileSystemDriver();
  AppFileSystem.setDriver(driver);
  return driver;
}

// Set automatically upon module import
AppFileSystem.setDriver(new MockFileSystemDriver());
