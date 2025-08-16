import type { StorageData, StorageKey } from './types.js';

/**
 * Storage abstraction for Chrome extension
 * Uses chrome.storage.sync for small config data and chrome.storage.local for larger payloads
 */
export class ExtensionStorage {
  private static readonly SYNC_KEYS: StorageKey[] = ['config', 'activeWorkspaceId'];
  private static readonly LOCAL_KEYS: StorageKey[] = ['workspaces', 'tabSets', 'savedTexts'];

  /**
   * Get data from storage
   */
  static async get<K extends StorageKey>(key: K): Promise<StorageData[K] | undefined> {
    const storage = this.SYNC_KEYS.includes(key) ? chrome.storage.sync : chrome.storage.local;
    const result = await storage.get([key]);
    return result[key] as StorageData[K] | undefined;
  }

  /**
   * Set data in storage
   */
  static async set<K extends StorageKey>(key: K, value: StorageData[K]): Promise<void> {
    const storage = this.SYNC_KEYS.includes(key) ? chrome.storage.sync : chrome.storage.local;
    await storage.set({ [key]: value });
  }

  /**
   * Remove data from storage
   */
  static async remove(key: StorageKey): Promise<void> {
    const storage = this.SYNC_KEYS.includes(key) ? chrome.storage.sync : chrome.storage.local;
    await storage.remove([key]);
  }

  /**
   * Get multiple keys from storage
   */
  static async getMultiple<K extends StorageKey>(keys: K[]): Promise<Partial<Pick<StorageData, K>>> {
    const syncKeys = keys.filter(key => this.SYNC_KEYS.includes(key));
    const localKeys = keys.filter(key => this.LOCAL_KEYS.includes(key));

    const [syncResult, localResult] = await Promise.all([
      syncKeys.length > 0 ? chrome.storage.sync.get(syncKeys) : Promise.resolve({}),
      localKeys.length > 0 ? chrome.storage.local.get(localKeys) : Promise.resolve({}),
    ]);

    return { ...syncResult, ...localResult } as Partial<Pick<StorageData, K>>;
  }

  /**
   * Set multiple values in storage
   */
  static async setMultiple(data: Partial<StorageData>): Promise<void> {
    const syncData: Record<string, unknown> = {};
    const localData: Record<string, unknown> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (this.SYNC_KEYS.includes(key as StorageKey)) {
        syncData[key] = value;
      } else {
        localData[key] = value;
      }
    });

    const promises: Promise<void>[] = [];
    if (Object.keys(syncData).length > 0) {
      promises.push(chrome.storage.sync.set(syncData));
    }
    if (Object.keys(localData).length > 0) {
      promises.push(chrome.storage.local.set(localData));
    }

    await Promise.all(promises);
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    await Promise.all([
      chrome.storage.sync.clear(),
      chrome.storage.local.clear(),
    ]);
  }

  /**
   * Listen to storage changes
   */
  static onChanged(callback: (changes: chrome.storage.StorageChange, areaName: string) => void): void {
    chrome.storage.onChanged.addListener(callback);
  }

  /**
   * Remove storage change listener
   */
  static removeListener(callback: (changes: chrome.storage.StorageChange, areaName: string) => void): void {
    chrome.storage.onChanged.removeListener(callback);
  }
}
