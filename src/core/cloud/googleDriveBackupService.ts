import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import { sha256 } from '@noble/hashes/sha256';
import { AppSecurityService } from '../security/appSecurityService';
import { bytesToBase64, base64ToBytes, stringToBytes } from '../crypto/cryptoService';

export interface CloudBackupMetadata {
  fileId: string;
  name: string;
  modifiedTime: string;
  sizeBytes: number;
}

export interface GoogleAccountInfo {
  email: string;
  name?: string;
  picture?: string;
}

export type AutoSyncFrequency = 'off' | 'on_change';
export type NetworkPreference = 'any' | 'wifi_only';

export interface CloudBackupStatus {
  isConfigured: boolean;
  isConnected: boolean;
  account: GoogleAccountInfo | null;
  lastBackupTime: string | null;
  lastBackupSize: number | null;
  autoSync: AutoSyncFrequency;
  networkPref: NetworkPreference;
}

// SecureStore Keys
const KEY_ACCESS_TOKEN = 'btw_gdrive_access_token';
const KEY_REFRESH_TOKEN = 'btw_gdrive_refresh_token';
const KEY_TOKEN_EXPIRY = 'btw_gdrive_token_expiry';
const KEY_USER_EMAIL = 'btw_gdrive_user_email';
const KEY_USER_NAME = 'btw_gdrive_user_name';
const KEY_LAST_BACKUP_TIME = 'btw_gdrive_last_backup_time';
const KEY_LAST_BACKUP_SIZE = 'btw_gdrive_last_backup_size';

// AsyncStorage Keys
const KEY_AUTO_SYNC = '@btw_gdrive_auto_sync';
const KEY_NETWORK_PREF = '@btw_gdrive_network_pref';

const BACKUP_FILE_NAME = 'btw_vault_backup.enc';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Safely lazy-load native Google Signin without crashing in Expo Go
let GoogleSigninModule: typeof import('@react-native-google-signin/google-signin') | null = null;
function getGoogleSignin(): typeof import('@react-native-google-signin/google-signin') | null {
  if (!GoogleSigninModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      GoogleSigninModule = require('@react-native-google-signin/google-signin');
    } catch {
      GoogleSigninModule = null;
    }
  }
  return GoogleSigninModule;
}

export class GoogleDriveBackupService {
  /**
   * Check if running inside the Expo Go client app
   */
  static isExpoGo(): boolean {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  }

  /**
   * Check if Google Drive backup is ready to authenticate.
   * On native Android, Google Play Services verifies via APK keystore SHA-1 (0 secret needed).
   */
  static isConfigured(): boolean {
    if (Platform.OS === 'android' && !this.isExpoGo()) {
      return true;
    }
    return Boolean(this.getClientId());
  }

  /**
   * Retrieve Google OAuth Client ID from environment variables.
   * Uses the Web Client ID for universal compatibility across APK and Expo Go.
   */
  static getClientId(): string {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      ''
    );
  }

  /**
   * Generates the OAuth redirect URI matching the Google Cloud Console Web Application configuration:
   * https://auth.expo.io/@the.ashish/btw-vault
   */
  static getRedirectUri(): string {
    return 'https://auth.expo.io/@the.ashish/btw-vault';
  }

  /**
   * Generates a random cryptographic PKCE code verifier and code challenge
   */
  private static async generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const verifier = toBase64Url(randomBytes);
    const hash = sha256(stringToBytes(verifier));
    const challenge = toBase64Url(hash);
    return { verifier, challenge };
  }

  /**
   * Get the cached Google account information from secure storage
   */
  static async getAccountInfo(): Promise<GoogleAccountInfo | null> {
    try {
      const email = await SecureStore.getItemAsync(KEY_USER_EMAIL);
      if (!email) return null;
      const name = (await SecureStore.getItemAsync(KEY_USER_NAME)) || undefined;
      return { email, name };
    } catch {
      return null;
    }
  }

  /**
   * Get the current status of Google Drive backup
   */
  static async getStatus(): Promise<CloudBackupStatus> {
    const isConfigured = this.isConfigured();
    const account = await this.getAccountInfo();
    const refreshToken = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
    const accessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
    const isConnected = Boolean(account && (refreshToken || accessToken));

    const lastBackupTime = await SecureStore.getItemAsync(KEY_LAST_BACKUP_TIME);
    const sizeStr = await SecureStore.getItemAsync(KEY_LAST_BACKUP_SIZE);
    const lastBackupSize = sizeStr ? parseInt(sizeStr, 10) : null;

    const autoSync = await this.getAutoSync();
    const networkPref = await this.getNetworkPreference();

    return {
      isConfigured,
      isConnected,
      account,
      lastBackupTime,
      lastBackupSize,
      autoSync,
      networkPref,
    };
  }

  /**
   * Get auto sync frequency setting (defaults to on_change if connected)
   */
  static async getAutoSync(): Promise<AutoSyncFrequency> {
    try {
      const val = await AsyncStorage.getItem(KEY_AUTO_SYNC);
      if (val === 'off' || val === 'on_change') return val;
      return 'on_change';
    } catch {
      return 'on_change';
    }
  }

  /**
   * Set auto sync frequency
   */
  static async setAutoSync(freq: AutoSyncFrequency): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_AUTO_SYNC, freq);
    } catch (e) {
      console.warn('Failed to save auto sync preference:', e);
    }
  }

  /**
   * Get network preference setting (defaults to any)
   */
  static async getNetworkPreference(): Promise<NetworkPreference> {
    try {
      const val = await AsyncStorage.getItem(KEY_NETWORK_PREF);
      if (val === 'wifi_only' || val === 'any') return val;
      return 'any';
    } catch {
      return 'any';
    }
  }

  /**
   * Set network preference
   */
  static async setNetworkPreference(pref: NetworkPreference): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_NETWORK_PREF, pref);
    } catch (e) {
      console.warn('Failed to save network preference:', e);
    }
  }

  /**
   * Triggers non-blocking background backup if Google Drive is connected and auto-sync is enabled
   */
  static async syncInBackgroundIfEnabled(
    armoredContentSupplier: () => Promise<string>
  ): Promise<boolean> {
    try {
      const status = await this.getStatus();
      if (!status.isConnected || status.autoSync !== 'on_change') {
        return false;
      }
      const armored = await armoredContentSupplier();
      await this.uploadBackup(armored);
      return true;
    } catch (e) {
      console.warn('Silent cloud sync error (non-fatal):', e);
      return false;
    }
  }

  /**
   * Authenticate with Google using native Google Play Services (0 secrets) on Android,
   * or OAuth 2.0 PKCE browser session on web/dev environments.
   */
  static async authenticate(): Promise<GoogleAccountInfo> {
    const nativeModule = getGoogleSignin();
    if (Platform.OS === 'android' && !this.isExpoGo() && nativeModule) {
      const { GoogleSignin, statusCodes } = nativeModule;
      try {
        GoogleSignin.configure({
          scopes: [
            'https://www.googleapis.com/auth/drive.appdata',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ],
        });

        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type !== 'success') {
          throw new Error('Google Sign-In canceled.');
        }

        const tokens = await GoogleSignin.getTokens();
        const accessToken = tokens.accessToken;
        if (!accessToken) {
          throw new Error('Could not retrieve access token from Google Play Services.');
        }

        const accountInfo: GoogleAccountInfo = {
          email: signInResult.data.user.email,
          name: signInResult.data.user.name || undefined,
          picture: signInResult.data.user.photo || undefined,
        };

        await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(KEY_USER_EMAIL, accountInfo.email);
        if (accountInfo.name) {
          await SecureStore.setItemAsync(KEY_USER_NAME, accountInfo.name);
        }

        return accountInfo;
      } catch (e: any) {
        if (e.code === statusCodes?.SIGN_IN_CANCELLED) {
          throw new Error('Google Sign-In was canceled.');
        }
        if (e.code === statusCodes?.IN_PROGRESS) {
          throw new Error('Google Sign-In is already in progress.');
        }
        if (e.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play Services is not available on this device.');
        }
        throw new Error(e.message || 'Failed to authenticate with Google Play Services.');
      }
    }

    if (this.isExpoGo()) {
      throw new Error(
        'Testing Google Drive backup with native Google Play Services requires the installed Android APK build. Expo Go sandbox does not include native Play Services.'
      );
    }

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error(
        'Google Client ID not configured. Please add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file.'
      );
    }

    const redirectUri = this.getRedirectUri();
    const { verifier, challenge } = await this.generatePKCE();

    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

    // Suppress privacy curtain while external browser auth sheet is active
    AppSecurityService.setSystemActivityActive(true);
    let result: WebBrowser.WebBrowserAuthSessionResult;
    try {
      const returnUrl = makeRedirectUri({
        scheme: 'btw-vault',
        path: 'oauthredirect',
      });
      const startUrl = `https://auth.expo.io/@the.ashish/btw-vault/start?${new URLSearchParams({
        authUrl,
        returnUrl,
      }).toString()}`;
      result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
    } finally {
      AppSecurityService.setSystemActivityActive(false);
    }

    if (result.type !== 'success' || !result.url) {
      throw new Error('Authentication canceled or dismissed.');
    }

    // Extract authorization code from callback URL
    let code: string | null = null;
    try {
      const parsedUrl = new URL(result.url);
      code = parsedUrl.searchParams.get('code');
      const err = parsedUrl.searchParams.get('error');
      if (err) {
        throw new Error(`Google Auth error: ${err}`);
      }
    } catch (e: any) {
      // Fallback regex parsing if URL parsing fails on custom scheme
      const match = result.url.match(/[?&]code=([^&]+)/);
      if (match) {
        code = decodeURIComponent(match[1]);
      } else {
        throw new Error(e.message || 'Failed to parse authorization code from response.');
      }
    }

    if (!code) {
      throw new Error('No authorization code returned from Google.');
    }

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET) {
      tokenParams.append('client_secret', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to exchange token: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in || 3600;
    const expiryTimestamp = Date.now() + expiresIn * 1000;

    await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);
    }
    await SecureStore.setItemAsync(KEY_TOKEN_EXPIRY, expiryTimestamp.toString());

    // Fetch user profile info
    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let accountInfo: GoogleAccountInfo = { email: 'Connected Google Account' };
    if (userInfoRes.ok) {
      const profile = await userInfoRes.json();
      accountInfo = {
        email: profile.email || 'Google User',
        name: profile.name,
        picture: profile.picture,
      };
      await SecureStore.setItemAsync(KEY_USER_EMAIL, accountInfo.email);
      if (accountInfo.name) {
        await SecureStore.setItemAsync(KEY_USER_NAME, accountInfo.name);
      }
    }

    return accountInfo;
  }

  /**
   * Retrieves a valid access token, automatically refreshing it if expired
   */
  static async getValidAccessToken(): Promise<string> {
    const nativeModule = getGoogleSignin();
    if (Platform.OS === 'android' && !this.isExpoGo() && nativeModule) {
      const { GoogleSignin } = nativeModule;
      try {
        const tokens = await GoogleSignin.getTokens();
        if (tokens.accessToken) {
          await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, tokens.accessToken);
          return tokens.accessToken;
        }
      } catch {
        try {
          const silentRes = await GoogleSignin.signInSilently();
          if (silentRes.type === 'success') {
            const freshTokens = await GoogleSignin.getTokens();
            if (freshTokens.accessToken) {
              await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, freshTokens.accessToken);
              return freshTokens.accessToken;
            }
          }
        } catch (silentErr) {
          console.warn('Silent Google Play Services refresh failed:', silentErr);
        }
      }
    }

    const accessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
    const expiryStr = await SecureStore.getItemAsync(KEY_TOKEN_EXPIRY);
    const refreshToken = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);

    const now = Date.now();
    const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
    const isExpired = !expiry || now >= expiry - 60000; // 60s buffer

    if (accessToken && !isExpired) {
      return accessToken;
    }

    if (!refreshToken) {
      if (accessToken) return accessToken;
      throw new Error('Google session expired. Please connect your Google account again.');
    }

    // Refresh token exchange
    const clientId = this.getClientId();
    const refreshParams = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET) {
      refreshParams.append('client_secret', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET);
    }

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refreshParams.toString(),
    });

    if (!refreshRes.ok) {
      const errText = await refreshRes.text();
      // If refresh token is revoked or invalid, clear stored session
      if (refreshRes.status === 400 || refreshRes.status === 401) {
        await this.disconnect();
      }
      throw new Error(`Google token refresh failed: ${errText}`);
    }

    const data = await refreshRes.json();
    const newAccessToken: string = data.access_token;
    const expiresIn: number = data.expires_in || 3600;
    const newExpiry = Date.now() + expiresIn * 1000;

    await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, newAccessToken);
    await SecureStore.setItemAsync(KEY_TOKEN_EXPIRY, newExpiry.toString());

    return newAccessToken;
  }

  /**
   * Search for existing backup file in Google Drive's hidden appDataFolder
   */
  static async fetchBackupMetadata(): Promise<CloudBackupMetadata | null> {
    const token = await this.getValidAccessToken();
    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime,size)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to check Drive backup: ${res.status}`);
    }

    const data = await res.json();
    const files = data.files;
    if (!files || files.length === 0) {
      return null;
    }

    const file = files[0];
    const sizeBytes = file.size ? parseInt(file.size, 10) : 0;
    const metadata: CloudBackupMetadata = {
      fileId: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime,
      sizeBytes,
    };

    // Update cached last backup info
    await SecureStore.setItemAsync(KEY_LAST_BACKUP_TIME, file.modifiedTime);
    await SecureStore.setItemAsync(KEY_LAST_BACKUP_SIZE, sizeBytes.toString());

    return metadata;
  }

  /**
   * Upload encrypted vault backup armored content to Google Drive appDataFolder
   */
  static async uploadBackup(armoredContent: string): Promise<CloudBackupMetadata> {
    const token = await this.getValidAccessToken();
    const existing = await this.fetchBackupMetadata();

    const boundary = `btw_vault_boundary_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = existing
      ? { name: BACKUP_FILE_NAME, mimeType: 'text/plain' }
      : { name: BACKUP_FILE_NAME, mimeType: 'text/plain', parents: ['appDataFolder'] };

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      armoredContent +
      closeDelimiter;

    const endpoint = existing
      ? `https://www.googleapis.com/upload/drive/v3/files/${existing.fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const method = existing ? 'PATCH' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to upload backup to Drive: ${errText}`);
    }

    const result = await res.json();
    const nowIso = new Date().toISOString();
    const sizeBytes = stringToBytes(armoredContent).byteLength;

    const metadataResult: CloudBackupMetadata = {
      fileId: result.id,
      name: BACKUP_FILE_NAME,
      modifiedTime: nowIso,
      sizeBytes,
    };

    await SecureStore.setItemAsync(KEY_LAST_BACKUP_TIME, nowIso);
    await SecureStore.setItemAsync(KEY_LAST_BACKUP_SIZE, sizeBytes.toString());

    return metadataResult;
  }

  /**
   * Download armored backup container from Google Drive appDataFolder
   */
  static async downloadBackup(): Promise<string> {
    const token = await this.getValidAccessToken();
    const existing = await this.fetchBackupMetadata();

    if (!existing) {
      throw new Error('No backup file found in your Google Drive cloud storage.');
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${existing.fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to download backup file: ${res.status}`);
    }

    const content = await res.text();
    return content;
  }

  /**
   * Delete backup from Google Drive appDataFolder
   */
  static async deleteBackup(): Promise<void> {
    const token = await this.getValidAccessToken();
    const existing = await this.fetchBackupMetadata();

    if (!existing) {
      return;
    }

    await fetch(`https://www.googleapis.com/drive/v3/files/${existing.fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    await SecureStore.deleteItemAsync(KEY_LAST_BACKUP_TIME);
    await SecureStore.deleteItemAsync(KEY_LAST_BACKUP_SIZE);
  }

  /**
   * Disconnect Google account and remove local tokens and credentials
   */
  static async disconnect(): Promise<void> {
    const nativeModule = getGoogleSignin();
    if (Platform.OS === 'android' && !this.isExpoGo() && nativeModule) {
      try {
        await nativeModule.GoogleSignin.signOut();
      } catch (e) {
        console.warn('Google Play Services sign out error:', e);
      }
    }

    try {
      const accessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
      if (accessToken) {
        // Best effort token revocation
        fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch(() => {});
      }
    } catch {
      // Ignore network errors on revocation
    }

    await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEY_TOKEN_EXPIRY);
    await SecureStore.deleteItemAsync(KEY_USER_EMAIL);
    await SecureStore.deleteItemAsync(KEY_USER_NAME);
    await SecureStore.deleteItemAsync(KEY_LAST_BACKUP_TIME);
    await SecureStore.deleteItemAsync(KEY_LAST_BACKUP_SIZE);
  }
}
