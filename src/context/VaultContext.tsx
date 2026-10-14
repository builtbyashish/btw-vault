import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VaultItem, VaultStatus, VaultConfig, EncryptedPayload, CustomCategoryDefinition } from '../types';
import { CryptoService, base64ToBytes, bytesToBase64 } from '../core/crypto/cryptoService';
import { VaultStorage } from '../core/storage/vaultStorage';
import { SecureStorageService } from '../core/storage/secureStorageService';
import { BiometricService } from '../core/security/biometricService';
import { BiometricPromptService } from '../core/security/biometricPromptService';
import { AppSecurityService } from '../core/security/appSecurityService';
import { ExportImportService } from '../core/migration/exportImportService';
import { GoogleDriveBackupService } from '../core/cloud/googleDriveBackupService';

interface VaultContextType {
  status: VaultStatus;
  items: VaultItem[];
  config: VaultConfig | null;
  biometricEnabled: boolean;
  autoLockMinutes: number;
  error: string | null;
  isLoading: boolean;
  isCreateSheetOpen: boolean;
  openCreateSheet: () => void;
  closeCreateSheet: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  viewMode: 'dynamic' | 'list';
  setViewMode: (mode: 'dynamic' | 'list') => void;
  toggleViewMode: () => void;
  setupVault: (password: string, enableBiometric: boolean) => Promise<boolean>;
  unlockWithPassword: (password: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  verifyMasterPassword: (password: string) => Promise<boolean>;
  lockVault: () => void;
  addItem: (itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateItem: (item: VaultItem) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  togglePinItem: (id: string) => Promise<boolean>;
  toggleBiometric: (enable: boolean) => Promise<boolean>;
  setAutoLockMinutes: (minutes: number) => Promise<boolean>;
  wipeVault: () => Promise<void>;
  importVaultBackup: (config: VaultConfig, payload: EncryptedPayload) => Promise<boolean>;
  customCategories: CustomCategoryDefinition[];
  pinnedCategoryIds: string[];
  addCustomCategory: (cat: Omit<CustomCategoryDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateCustomCategory: (cat: CustomCategoryDefinition) => Promise<boolean>;
  deleteCustomCategory: (id: string) => Promise<boolean>;
  setPinnedCategoryIds: (ids: string[]) => Promise<boolean>;
}

function sanitizeVaultItems(rawItems: VaultItem[]): VaultItem[] {
  return rawItems.map((item) => {
    if ((item.category as string) === 'document' || (item.category as string) === 'identity') {
      return {
        ...item,
        category: 'note' as const,
        notes: item.notes || (item.document?.name ? `Imported: ${item.document.name}` : undefined),
      };
    }
    return item;
  });
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<VaultStatus>('authenticating');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'dynamic' | 'list'>('dynamic');

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'dynamic' ? 'list' : 'dynamic'));
  };

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const toggleSearch = () => {
    setIsSearchOpen((prev) => {
      if (prev) {
        setSearchQuery('');
      }
      return !prev;
    });
  };

  // In-memory key & salt
  const masterKeyRef = useRef<Uint8Array | null>(null);
  const saltRef = useRef<Uint8Array | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  // Check vault initialization on boot
  useEffect(() => {
    checkInitialization();
  }, []);

  // Inactivity / background lock listener
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!AppSecurityService.isSystemActivityActive()) {
          lastActiveRef.current = Date.now();
          // Security App Standard: lock vault immediately on minimize / background
          if (nextAppState === 'background' && (autoLockMinutes === 0 || autoLockMinutes === undefined)) {
            if (status === 'unlocked') {
              lockVault();
            }
          }
        }
      } else if (nextAppState === 'active') {
        if (!AppSecurityService.isSystemActivityActive()) {
          if (status === 'unlocked') {
            if (autoLockMinutes === 0 || autoLockMinutes === undefined) {
              lockVault();
            } else if (autoLockMinutes > 0) {
              const elapsedMinutes = (Date.now() - lastActiveRef.current) / (1000 * 60);
              if (elapsedMinutes >= autoLockMinutes) {
                lockVault();
              }
            }
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [status, autoLockMinutes]);

  const checkInitialization = async () => {
    setIsLoading(true);
    try {
      const initialized = await VaultStorage.isVaultInitialized();
      if (!initialized) {
        setStatus('uninitialized');
      } else {
        const loadedConfig = await VaultStorage.loadVaultConfig();
        if (loadedConfig) {
          setConfig(loadedConfig);
          setBiometricEnabledState(loadedConfig.biometricEnabled ?? false);
          const storedAutoLock = loadedConfig.autoLockMinutes;
          const effectiveAutoLock = (storedAutoLock === undefined || storedAutoLock === 5) ? 0 : storedAutoLock;
          setAutoLockMinutesState(effectiveAutoLock);
          saltRef.current = base64ToBytes(loadedConfig.salt);
          setStatus('locked');
        } else {
          setStatus('uninitialized');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to check vault status');
      setStatus('uninitialized');
    } finally {
      setIsLoading(false);
    }
  };

  const setupVault = async (password: string, enableBiometric: boolean): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const salt = CryptoService.getRandomBytes(32);
      saltRef.current = salt;

      const masterKey = await CryptoService.deriveMasterKey(password, salt);
      masterKeyRef.current = masterKey;

      const verificationPayload = CryptoService.createVerificationToken(masterKey, salt);

      const newConfig: VaultConfig = {
        salt: bytesToBase64(salt),
        verification: verificationPayload,
        biometricEnabled: enableBiometric,
        autoLockMinutes: 0,
        updatedAt: new Date().toISOString(),
      };

      // Save initial empty vault items
      const initialPayload = CryptoService.encryptVaultItems([], masterKey, salt);
      await VaultStorage.saveEncryptedVault(initialPayload);
      await VaultStorage.saveVaultConfig(newConfig);

      if (enableBiometric) {
        await SecureStorageService.storeMasterKeyForBiometric(masterKey);
      }

      setConfig(newConfig);
      setBiometricEnabledState(enableBiometric);
      setItems([]);
      setStatus('unlocked');
      return true;
    } catch (e: any) {
      setError(e.message || 'Setup failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unlockWithPassword = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!config) {
        const loaded = await VaultStorage.loadVaultConfig();
        if (!loaded) throw new Error('Vault is uninitialized');
        setConfig(loaded);
      }

      const activeConfig = config || (await VaultStorage.loadVaultConfig())!;
      const salt = base64ToBytes(activeConfig.salt);
      saltRef.current = salt;

      const masterKey = await CryptoService.deriveMasterKey(password, salt);
      const isValid = CryptoService.verifyMasterKey(masterKey, activeConfig.verification);

      if (!isValid) {
        CryptoService.wipeBytes(masterKey);
        setError('Incorrect Master Password');
        return false;
      }

      masterKeyRef.current = masterKey;

      // Update biometric store if enabled
      if (activeConfig.biometricEnabled) {
        await SecureStorageService.storeMasterKeyForBiometric(masterKey);
      }

      const encryptedVault = await VaultStorage.loadEncryptedVault();
      if (encryptedVault) {
        const decryptedItems = CryptoService.decryptVaultItems(encryptedVault, masterKey);
        setItems(sanitizeVaultItems(decryptedItems));
      } else {
        setItems([]);
      }

      setStatus('unlocked');
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to unlock vault');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    setError(null);
    try {
      const authenticated = await BiometricService.authenticate('Unlock btw vault');
      if (!authenticated) {
        return false;
      }

      setIsLoading(true);
      const masterKey = await SecureStorageService.getMasterKeyForBiometric();
      if (!masterKey) {
        setError('Biometric token expired. Please enter master password.');
        return false;
      }

      const activeConfig = config || (await VaultStorage.loadVaultConfig())!;
      const isValid = CryptoService.verifyMasterKey(masterKey, activeConfig.verification);

      if (!isValid) {
        await SecureStorageService.clearBiometricKey();
        setError('Stored biometric key is invalid');
        return false;
      }

      masterKeyRef.current = masterKey;
      saltRef.current = base64ToBytes(activeConfig.salt);

      const encryptedVault = await VaultStorage.loadEncryptedVault();
      if (encryptedVault) {
        const decryptedItems = CryptoService.decryptVaultItems(encryptedVault, masterKey);
        setItems(sanitizeVaultItems(decryptedItems));
      } else {
        setItems([]);
      }

      setStatus('unlocked');
      return true;
    } catch (e: any) {
      setError(e.message || 'Biometric unlock error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMasterPassword = async (password: string): Promise<boolean> => {
    try {
      const activeConfig = config || (await VaultStorage.loadVaultConfig());
      if (!activeConfig) return false;
      const salt = base64ToBytes(activeConfig.salt);
      const testKey = await CryptoService.deriveMasterKey(password, salt);
      const isValid = CryptoService.verifyMasterKey(testKey, activeConfig.verification);
      CryptoService.wipeBytes(testKey);
      return isValid;
    } catch {
      return false;
    }
  };

  const lockVault = () => {
    if (masterKeyRef.current) {
      CryptoService.wipeBytes(masterKeyRef.current);
      masterKeyRef.current = null;
    }
    setItems([]);
    setStatus('locked');
  };

  const persistVaultItems = async (updatedItems: VaultItem[]): Promise<boolean> => {
    if (!masterKeyRef.current || !saltRef.current) return false;
    try {
      const encryptedPayload = CryptoService.encryptVaultItems(
        updatedItems,
        masterKeyRef.current,
        saltRef.current
      );
      await VaultStorage.saveEncryptedVault(encryptedPayload);
      setItems(updatedItems);

      // WhatsApp-style silent background cloud sync if enabled
      GoogleDriveBackupService.syncInBackgroundIfEnabled(() =>
        ExportImportService.getArmoredVaultBackup()
      ).catch(() => {});

      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to save item');
      return false;
    }
  };

  const addItem = async (
    itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    const newItem: VaultItem = {
      ...itemData,
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...items];
    return await persistVaultItems(updated);
  };

  const updateItem = async (item: VaultItem): Promise<boolean> => {
    const updatedItem = { ...item, updatedAt: new Date().toISOString() };
    const updated = items.map((i) => (i.id === item.id ? updatedItem : i));
    return await persistVaultItems(updated);
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    const updated = items.filter((i) => i.id !== id);
    return await persistVaultItems(updated);
  };

  const togglePinItem = async (id: string): Promise<boolean> => {
    const updated = items.map((i) =>
      i.id === id ? { ...i, isPinned: !i.isPinned, updatedAt: new Date().toISOString() } : i
    );
    return await persistVaultItems(updated);
  };

  const toggleBiometric = async (enable: boolean): Promise<boolean> => {
    if (!config || !masterKeyRef.current) return false;
    try {
      if (enable) {
        const available = await BiometricService.isBiometricAvailable();
        if (!available) {
          setError('Biometrics unavailable on this device');
          return false;
        }
        await SecureStorageService.storeMasterKeyForBiometric(masterKeyRef.current);
      } else {
        await SecureStorageService.clearBiometricKey();
      }

      const updatedConfig: VaultConfig = {
        ...config,
        biometricEnabled: enable,
        updatedAt: new Date().toISOString(),
      };
      await VaultStorage.saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);
      setBiometricEnabledState(enable);
      if (enable) {
        await BiometricPromptService.clearBiometricPromptState();
      }
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to update biometric setting');
      return false;
    }
  };

  const setAutoLockMinutes = async (minutes: number): Promise<boolean> => {
    if (!config) return false;
    try {
      const updatedConfig: VaultConfig = {
        ...config,
        autoLockMinutes: minutes,
        updatedAt: new Date().toISOString(),
      };
      await VaultStorage.saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);
      setAutoLockMinutesState(minutes);
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to update auto-lock setting');
      return false;
    }
  };

  const wipeVault = async (): Promise<void> => {
    lockVault();
    await SecureStorageService.clearBiometricKey();
    await BiometricPromptService.clearBiometricPromptState();
    await VaultStorage.wipeLocalVault();
    setConfig(null);
    setStatus('uninitialized');
  };

  const importVaultBackup = async (
    newConfig: VaultConfig,
    newPayload: EncryptedPayload
  ): Promise<boolean> => {
    try {
      // 1. Wipe previous in-memory master key and decrypted items
      if (masterKeyRef.current) {
        CryptoService.wipeBytes(masterKeyRef.current);
        masterKeyRef.current = null;
      }
      setItems([]);

      // 2. Clear biometric key from device Keychain/KeyStore
      // (The imported vault has a new master key that has not yet been authorized on this device)
      await SecureStorageService.clearBiometricKey();

      // 3. Mark for biometric setup prompt after next successful master password unlock
      await BiometricPromptService.markVaultJustImported();

      // 4. Set biometricEnabled to false until user unlocks with password and opts in
      const cleanConfig: VaultConfig = {
        ...newConfig,
        biometricEnabled: false,
        updatedAt: new Date().toISOString(),
      };

      await VaultStorage.saveVaultConfig(cleanConfig);
      await VaultStorage.saveEncryptedVault(newPayload);

      setConfig(cleanConfig);
      setBiometricEnabledState(false);
      saltRef.current = base64ToBytes(cleanConfig.salt);
      setStatus('locked');
      return true;
    } catch (e: any) {
      setError(e.message || 'Import failed');
      return false;
    }
  };

  const customCategories = useMemo(() => config?.customCategories || [], [config]);
  const pinnedCategoryIds = useMemo(
    () => config?.pinnedCategoryIds || ['all', 'login', 'card', 'note'],
    [config]
  );

  const addCustomCategory = async (
    catData: Omit<CustomCategoryDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    try {
      const activeConfig = config || (await VaultStorage.loadVaultConfig());
      if (!activeConfig) return false;
      const newCat: CustomCategoryDefinition = {
        ...catData,
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const existingList = activeConfig.customCategories || [];
      const updatedList = [...existingList, newCat];

      const currentPinned = activeConfig.pinnedCategoryIds || ['all', 'login', 'card', 'note'];
      const updatedPinned = currentPinned.length < 5 ? [...currentPinned, newCat.id] : currentPinned;

      const updatedConfig: VaultConfig = {
        ...activeConfig,
        customCategories: updatedList,
        pinnedCategoryIds: updatedPinned,
        updatedAt: new Date().toISOString(),
      };
      await VaultStorage.saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);

      GoogleDriveBackupService.syncInBackgroundIfEnabled(() =>
        ExportImportService.getArmoredVaultBackup()
      ).catch(() => {});

      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to add custom category');
      return false;
    }
  };

  const updateCustomCategory = async (cat: CustomCategoryDefinition): Promise<boolean> => {
    try {
      const activeConfig = config || (await VaultStorage.loadVaultConfig());
      if (!activeConfig) return false;
      const existingList = activeConfig.customCategories || [];
      const updatedList = existingList.map((c) =>
        c.id === cat.id ? { ...cat, updatedAt: new Date().toISOString() } : c
      );
      const updatedConfig: VaultConfig = {
        ...activeConfig,
        customCategories: updatedList,
        updatedAt: new Date().toISOString(),
      };
      await VaultStorage.saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);

      GoogleDriveBackupService.syncInBackgroundIfEnabled(() =>
        ExportImportService.getArmoredVaultBackup()
      ).catch(() => {});

      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to update custom category');
      return false;
    }
  };

  const deleteCustomCategory = async (id: string): Promise<boolean> => {
    try {
      const activeConfig = config || (await VaultStorage.loadVaultConfig());
      if (!activeConfig) return false;
      const existingList = activeConfig.customCategories || [];
      const updatedList = existingList.filter((c) => c.id !== id);
      const currentPinned = activeConfig.pinnedCategoryIds || ['all', 'login', 'card', 'note'];
      const updatedPinned = currentPinned.filter((pId) => pId !== id);

      const updatedConfig: VaultConfig = {
        ...activeConfig,
        customCategories: updatedList,
        pinnedCategoryIds: updatedPinned,
        updatedAt: new Date().toISOString(),
      };
      await VaultStorage.saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);

      const affectedItems = items.filter((it) => it.category === id);
      if (affectedItems.length > 0) {
        const updatedItems = items.map((it) =>
          it.category === id ? { ...it, category: 'other' as const, updatedAt: new Date().toISOString() } : it
        );
        await persistVaultItems(updatedItems);
      }

      GoogleDriveBackupService.syncInBackgroundIfEnabled(() =>
        ExportImportService.getArmoredVaultBackup()
      ).catch(() => {});

      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to delete custom category');
      return false;
    }
  };

  const setPinnedCategoryIds = async (ids: string[]): Promise<boolean> => {
    try {
      const activeConfig = config || (await VaultStorage.loadVaultConfig());
      if (!activeConfig) return false;
      const updatedConfig: VaultConfig = {
        ...activeConfig,
        pinnedCategoryIds: ids.slice(0, 5),
        updatedAt: new Date().toISOString(),
      };
      await VaultStorage.saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to update pinned categories');
      return false;
    }
  };

  return (
    <VaultContext.Provider
      value={{
        status,
        items,
        config,
        biometricEnabled,
        autoLockMinutes,
        error,
        isLoading,
        isCreateSheetOpen,
        openCreateSheet,
        closeCreateSheet,
        isSearchOpen,
        setIsSearchOpen,
        toggleSearch,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        viewMode,
        setViewMode,
        toggleViewMode,
        setupVault,
        unlockWithPassword,
        unlockWithBiometrics,
        verifyMasterPassword,
        lockVault,
        addItem,
        updateItem,
        deleteItem,
        togglePinItem,
        toggleBiometric,
        setAutoLockMinutes,
        wipeVault,
        importVaultBackup,
        customCategories,
        pinnedCategoryIds,
        addCustomCategory,
        updateCustomCategory,
        deleteCustomCategory,
        setPinnedCategoryIds,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within VaultProvider');
  return context;
};
