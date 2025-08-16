// Enhanced types for storage operations
export type WorkspaceId = string;

export interface TabRef {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  index: number;
}

export interface Highlight {
  id: string;
  text: string;
  url: string;
  title: string;
  createdAt: number;
  tags?: string[];
}

export interface Settings {
  openaiApiKey?: string;
  notionApiKey?: string;
  notionIntegrationEnabled: boolean;
  focusModeEnabled: boolean;
  autoSaveTabSets: boolean;
  theme?: 'light' | 'dark' | 'auto';
  maxHighlights?: number;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  color?: string;
  icon?: string;
}

export interface TabSet {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  tabs: TabRef[];
  createdAt: number;
  updatedAt: number;
}

// Storage keys
const STORAGE_KEYS = {
  // Sync storage (small data, synced across devices)
  SETTINGS: 'mv_settings',
  ACTIVE_WORKSPACE: 'mv_active_workspace',
  WORKSPACE_METADATA: 'mv_workspace_metadata',

  // Local storage (larger data, device-specific)
  WORKSPACES: 'mv_workspaces',
  TAB_SETS: 'mv_tab_sets',
  HIGHLIGHTS: 'mv_highlights',
} as const;

/**
 * Enhanced storage abstraction for Chrome extension
 * Uses chrome.storage.sync for settings and chrome.storage.local for larger data
 */
export class StorageManager {
  private static instance: StorageManager;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private constructor() {}

  // Workspace Management

  /**
   * List all workspaces
   */
  async listWorkspaces(): Promise<Workspace[]> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.WORKSPACES]);
      return result[STORAGE_KEYS.WORKSPACES] || [];
    } catch (error) {
      console.error('Failed to list workspaces:', error);
      return [];
    }
  }

  /**
   * Get a specific workspace by ID
   */
  async getWorkspace(id: WorkspaceId): Promise<Workspace | null> {
    try {
      const workspaces = await this.listWorkspaces();
      return workspaces.find((w) => w.id === id) || null;
    } catch (error) {
      console.error('Failed to get workspace:', error);
      return null;
    }
  }

  /**
   * Save a workspace (create or update)
   */
  async saveWorkspace(workspace: Workspace): Promise<void> {
    try {
      const workspaces = await this.listWorkspaces();
      const existingIndex = workspaces.findIndex((w) => w.id === workspace.id);

      if (existingIndex >= 0) {
        workspaces[existingIndex] = { ...workspace, updatedAt: Date.now() };
      } else {
        workspaces.push(workspace);
      }

      await chrome.storage.local.set({ [STORAGE_KEYS.WORKSPACES]: workspaces });
    } catch (error) {
      console.error('Failed to save workspace:', error);
      throw new Error(`Failed to save workspace: ${error}`);
    }
  }

  /**
   * Delete a workspace and its associated data
   */
  async deleteWorkspace(id: WorkspaceId): Promise<void> {
    try {
      // Remove workspace from list
      const workspaces = await this.listWorkspaces();
      const filteredWorkspaces = workspaces.filter((w) => w.id !== id);
      await chrome.storage.local.set({
        [STORAGE_KEYS.WORKSPACES]: filteredWorkspaces,
      });

      // Clear active workspace if it was deleted
      const activeWorkspace = await this.getActiveWorkspace();
      if (activeWorkspace === id) {
        await this.setActiveWorkspace(null);
      }

      // Clean up associated tab sets
      const tabSets = await this.getAllTabSets();
      const filteredTabSets = tabSets.filter((ts) => ts.workspaceId !== id);
      await chrome.storage.local.set({
        [STORAGE_KEYS.TAB_SETS]: filteredTabSets,
      });

      // Clean up highlights
      const highlights = await this.getAllHighlights();
      const filteredHighlights: Record<string, Highlight[]> = {};
      Object.entries(highlights).forEach(([workspaceId, highlightList]) => {
        if (workspaceId !== id) {
          filteredHighlights[workspaceId] = highlightList;
        }
      });
      await chrome.storage.local.set({
        [STORAGE_KEYS.HIGHLIGHTS]: filteredHighlights,
      });
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      throw new Error(`Failed to delete workspace: ${error}`);
    }
  }

  /**
   * Set the active workspace
   */
  async setActiveWorkspace(id: WorkspaceId | null): Promise<void> {
    try {
      if (id === null) {
        await chrome.storage.sync.remove([STORAGE_KEYS.ACTIVE_WORKSPACE]);
      } else {
        await chrome.storage.sync.set({ [STORAGE_KEYS.ACTIVE_WORKSPACE]: id });
      }

      // Update isActive flag on workspaces
      const workspaces = await this.listWorkspaces();
      const updatedWorkspaces = workspaces.map((w) => ({
        ...w,
        isActive: w.id === id,
        updatedAt: w.id === id ? Date.now() : w.updatedAt,
      }));
      await chrome.storage.local.set({
        [STORAGE_KEYS.WORKSPACES]: updatedWorkspaces,
      });
    } catch (error) {
      console.error('Failed to set active workspace:', error);
      throw new Error(`Failed to set active workspace: ${error}`);
    }
  }

  /**
   * Get the currently active workspace ID
   */
  async getActiveWorkspace(): Promise<WorkspaceId | null> {
    try {
      const result = await chrome.storage.sync.get([
        STORAGE_KEYS.ACTIVE_WORKSPACE,
      ]);
      return result[STORAGE_KEYS.ACTIVE_WORKSPACE] || null;
    } catch (error) {
      console.error('Failed to get active workspace:', error);
      return null;
    }
  }

  // Tab Set Management

  /**
   * Save a tab set for a workspace
   */
  async saveTabSet(
    workspaceId: WorkspaceId,
    tabs: TabRef[],
    name?: string
  ): Promise<string> {
    try {
      const tabSetId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tabSet: TabSet = {
        id: tabSetId,
        workspaceId,
        name: name || `Tab Set ${new Date().toLocaleDateString()}`,
        tabs,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const allTabSets = await this.getAllTabSets();
      allTabSets.push(tabSet);
      await chrome.storage.local.set({ [STORAGE_KEYS.TAB_SETS]: allTabSets });

      return tabSetId;
    } catch (error) {
      console.error('Failed to save tab set:', error);
      throw new Error(`Failed to save tab set: ${error}`);
    }
  }

  /**
   * Get a specific tab set by ID
   */
  async getTabSet(id: string): Promise<TabSet | null> {
    try {
      const allTabSets = await this.getAllTabSets();
      return allTabSets.find((ts) => ts.id === id) || null;
    } catch (error) {
      console.error('Failed to get tab set:', error);
      return null;
    }
  }

  /**
   * Get all tab sets for a workspace
   */
  async getWorkspaceTabSets(workspaceId: WorkspaceId): Promise<TabSet[]> {
    try {
      const allTabSets = await this.getAllTabSets();
      return allTabSets.filter((ts) => ts.workspaceId === workspaceId);
    } catch (error) {
      console.error('Failed to get workspace tab sets:', error);
      return [];
    }
  }

  /**
   * Get all tab sets (internal helper)
   */
  async getAllTabSets(): Promise<TabSet[]> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.TAB_SETS]);
    return result[STORAGE_KEYS.TAB_SETS] || [];
  }

  // Highlight Management

  /**
   * Add a highlight to a workspace
   */
  async appendHighlight(
    workspaceId: WorkspaceId,
    highlight: Highlight
  ): Promise<void> {
    try {
      const allHighlights = await this.getAllHighlights();

      if (!allHighlights[workspaceId]) {
        allHighlights[workspaceId] = [];
      }

      // Add new highlight at the beginning (most recent first)
      allHighlights[workspaceId].unshift(highlight);

      // Apply limit (default 50)
      const settings = await this.getSettings();
      const maxHighlights = settings.maxHighlights || 50;
      if (allHighlights[workspaceId].length > maxHighlights) {
        allHighlights[workspaceId] = allHighlights[workspaceId].slice(
          0,
          maxHighlights
        );
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.HIGHLIGHTS]: allHighlights,
      });
    } catch (error) {
      console.error('Failed to append highlight:', error);
      throw new Error(`Failed to append highlight: ${error}`);
    }
  }

  /**
   * Get highlights for a workspace
   */
  async getHighlights(
    workspaceId: WorkspaceId,
    limit = 50
  ): Promise<Highlight[]> {
    try {
      const allHighlights = await this.getAllHighlights();
      const workspaceHighlights = allHighlights[workspaceId] || [];
      return workspaceHighlights.slice(0, limit);
    } catch (error) {
      console.error('Failed to get highlights:', error);
      return [];
    }
  }

  /**
   * Get all highlights (internal helper)
   */
  async getAllHighlights(): Promise<Record<WorkspaceId, Highlight[]>> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.HIGHLIGHTS]);
    return result[STORAGE_KEYS.HIGHLIGHTS] || {};
  }

  // Settings Management

  /**
   * Get user settings
   */
  async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS]);
      const defaultSettings: Settings = {
        notionIntegrationEnabled: false,
        focusModeEnabled: false,
        autoSaveTabSets: false,
        theme: 'auto',
        maxHighlights: 50,
      };
      return { ...defaultSettings, ...result[STORAGE_KEYS.SETTINGS] };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        notionIntegrationEnabled: false,
        focusModeEnabled: false,
        autoSaveTabSets: false,
        theme: 'auto',
        maxHighlights: 50,
      };
    }
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: Partial<Settings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await chrome.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: updatedSettings,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error(`Failed to save settings: ${error}`);
    }
  }

  // Utility Methods

  /**
   * Clear all extension data
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        chrome.storage.sync.clear(),
        chrome.storage.local.clear(),
      ]);
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw new Error(`Failed to clear all data: ${error}`);
    }
  }

  /**
   * Export all data for backup
   */
  async exportData(): Promise<Record<string, unknown>> {
    try {
      const [syncData, localData] = await Promise.all([
        chrome.storage.sync.get(null),
        chrome.storage.local.get(null),
      ]);

      return {
        sync: syncData,
        local: localData,
        exportedAt: Date.now(),
        version: '1.0.0',
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error(`Failed to export data: ${error}`);
    }
  }

  /**
   * Import data from backup
   */
  async importData(data: {
    sync: Record<string, unknown>;
    local: Record<string, unknown>;
  }): Promise<void> {
    try {
      await Promise.all([
        chrome.storage.sync.set(data.sync),
        chrome.storage.local.set(data.local),
      ]);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error(`Failed to import data: ${error}`);
    }
  }
}

// Export convenience instance
export const storage = StorageManager.getInstance();

// Legacy ExtensionStorage class for backward compatibility
export class ExtensionStorage {
  static async get(key: string): Promise<unknown> {
    const storageInstance = StorageManager.getInstance();

    switch (key) {
      case 'workspaces':
        return storageInstance.listWorkspaces();
      case 'activeWorkspaceId':
        return storageInstance.getActiveWorkspace();
      case 'config':
        return storageInstance.getSettings();
      case 'tabSets':
        return storageInstance.getAllTabSets();
      case 'savedTexts':
        const highlights = await storageInstance.getAllHighlights();
        return Object.values(highlights).flat();
      default:
        // Dynamic key access for quick notes
        if (key.startsWith('quickNotes_')) {
          const result = await chrome.storage.local.get([key]);
          return result[key];
        }
        return undefined;
    }
  }

  static async set(key: string, value: unknown): Promise<void> {
    const storageInstance = StorageManager.getInstance();

    switch (key) {
      case 'workspaces':
        // This is complex to handle generically, recommend using new API
        await chrome.storage.local.set({ [STORAGE_KEYS.WORKSPACES]: value });
        break;
      case 'activeWorkspaceId':
        await storageInstance.setActiveWorkspace(value as WorkspaceId);
        break;
      case 'config':
        await storageInstance.saveSettings(value as Settings);
        break;
      default:
        // Dynamic key access for quick notes
        if (key.startsWith('quickNotes_')) {
          await chrome.storage.local.set({ [key]: value });
        }
        break;
    }
  }

  static async remove(key: string): Promise<void> {
    if (key === 'activeWorkspaceId') {
      const storageInstance = StorageManager.getInstance();
      await storageInstance.setActiveWorkspace(null);
    } else {
      await chrome.storage.local.remove([key]);
    }
  }
}
