import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  StorageManager,
  type Workspace,
  type TabRef,
  type Highlight,
  type Settings,
} from '../storage';
import { mockStorage } from './setup';

describe('StorageManager', () => {
  let storage: StorageManager;

  beforeEach(() => {
    storage = StorageManager.getInstance();
  });

  describe('Workspace Management', () => {
    test('listWorkspaces returns empty array when no workspaces exist', async () => {
      const workspaces = await storage.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    test('saveWorkspace creates a new workspace', async () => {
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);
      const workspaces = await storage.listWorkspaces();

      expect(workspaces).toHaveLength(1);
      expect(workspaces[0]).toMatchObject({
        id: 'ws1',
        name: 'Test Workspace',
        isActive: false,
      });
    });

    test('saveWorkspace updates existing workspace', async () => {
      const now = Date.now();
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: now,
        updatedAt: now,
        isActive: false,
      };

      await storage.saveWorkspace(workspace);

      // Wait a small amount to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updatedWorkspace = {
        ...workspace,
        name: 'Updated Workspace',
      };

      await storage.saveWorkspace(updatedWorkspace);
      const workspaces = await storage.listWorkspaces();

      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].name).toBe('Updated Workspace');
      expect(workspaces[0].updatedAt).toBeGreaterThan(workspace.updatedAt);
    });

    test('getWorkspace returns specific workspace', async () => {
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);
      const retrieved = await storage.getWorkspace('ws1');

      expect(retrieved).toMatchObject(workspace);
    });

    test('getWorkspace returns null for non-existent workspace', async () => {
      const retrieved = await storage.getWorkspace('non-existent');
      expect(retrieved).toBeNull();
    });

    test('deleteWorkspace removes workspace and associated data', async () => {
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);
      await storage.setActiveWorkspace('ws1');

      // Add a tab set for this workspace
      await storage.saveTabSet('ws1', []);

      // Add highlights for this workspace
      const highlight: Highlight = {
        id: 'h1',
        text: 'Test highlight',
        url: 'https://example.com',
        title: 'Example',
        createdAt: Date.now(),
      };
      await storage.appendHighlight('ws1', highlight);

      await storage.deleteWorkspace('ws1');

      const workspaces = await storage.listWorkspaces();
      const activeWorkspace = await storage.getActiveWorkspace();
      const tabSets = await storage.getWorkspaceTabSets('ws1');
      const highlights = await storage.getHighlights('ws1');

      expect(workspaces).toHaveLength(0);
      expect(activeWorkspace).toBeNull();
      expect(tabSets).toHaveLength(0);
      expect(highlights).toHaveLength(0);
    });
  });

  describe('Active Workspace Management', () => {
    test('setActiveWorkspace and getActiveWorkspace work correctly', async () => {
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);
      await storage.setActiveWorkspace('ws1');

      const activeWorkspace = await storage.getActiveWorkspace();
      expect(activeWorkspace).toBe('ws1');

      // Check that isActive flag is updated
      const workspaces = await storage.listWorkspaces();
      expect(workspaces[0].isActive).toBe(true);
    });

    test('setActiveWorkspace with null clears active workspace', async () => {
      await storage.setActiveWorkspace('ws1');
      await storage.setActiveWorkspace(null);

      const activeWorkspace = await storage.getActiveWorkspace();
      expect(activeWorkspace).toBeNull();
    });
  });

  describe('Tab Set Management', () => {
    test('saveTabSet creates a new tab set', async () => {
      const tabs: TabRef[] = [
        {
          id: 'tab1',
          url: 'https://example.com',
          title: 'Example',
          pinned: false,
          index: 0,
        },
      ];

      const tabSetId = await storage.saveTabSet('ws1', tabs, 'Test Tab Set');
      const tabSet = await storage.getTabSet(tabSetId);

      expect(tabSet).not.toBeNull();
      expect(tabSet!.name).toBe('Test Tab Set');
      expect(tabSet!.workspaceId).toBe('ws1');
      expect(tabSet!.tabs).toEqual(tabs);
    });

    test('getTabSet returns null for non-existent tab set', async () => {
      const tabSet = await storage.getTabSet('non-existent');
      expect(tabSet).toBeNull();
    });

    test('getWorkspaceTabSets returns tab sets for specific workspace', async () => {
      const tabs: TabRef[] = [
        {
          id: 'tab1',
          url: 'https://example.com',
          title: 'Example',
          pinned: false,
          index: 0,
        },
      ];

      await storage.saveTabSet('ws1', tabs, 'Tab Set 1');
      await storage.saveTabSet('ws1', tabs, 'Tab Set 2');
      await storage.saveTabSet('ws2', tabs, 'Tab Set 3');

      const ws1TabSets = await storage.getWorkspaceTabSets('ws1');
      const ws2TabSets = await storage.getWorkspaceTabSets('ws2');

      expect(ws1TabSets).toHaveLength(2);
      expect(ws2TabSets).toHaveLength(1);
      expect(ws1TabSets[0].workspaceId).toBe('ws1');
      expect(ws1TabSets[1].workspaceId).toBe('ws1');
      expect(ws2TabSets[0].workspaceId).toBe('ws2');
    });
  });

  describe('Highlight Management', () => {
    test('appendHighlight adds highlight to workspace', async () => {
      const highlight: Highlight = {
        id: 'h1',
        text: 'Test highlight',
        url: 'https://example.com',
        title: 'Example',
        createdAt: Date.now(),
      };

      await storage.appendHighlight('ws1', highlight);
      const highlights = await storage.getHighlights('ws1');

      expect(highlights).toHaveLength(1);
      expect(highlights[0]).toEqual(highlight);
    });

    test('appendHighlight respects maxHighlights limit', async () => {
      // Set max highlights to 2
      await storage.saveSettings({ maxHighlights: 2 });

      const highlights: Highlight[] = [
        {
          id: 'h1',
          text: 'Highlight 1',
          url: 'https://example.com',
          title: 'Example',
          createdAt: 1,
        },
        {
          id: 'h2',
          text: 'Highlight 2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: 2,
        },
        {
          id: 'h3',
          text: 'Highlight 3',
          url: 'https://example.com',
          title: 'Example',
          createdAt: 3,
        },
      ];

      for (const highlight of highlights) {
        await storage.appendHighlight('ws1', highlight);
      }

      const result = await storage.getHighlights('ws1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('h3'); // Most recent first
      expect(result[1].id).toBe('h2');
    });

    test('getHighlights respects limit parameter', async () => {
      const highlights: Highlight[] = Array.from({ length: 5 }, (_, i) => ({
        id: `h${i}`,
        text: `Highlight ${i}`,
        url: 'https://example.com',
        title: 'Example',
        createdAt: i,
      }));

      for (const highlight of highlights) {
        await storage.appendHighlight('ws1', highlight);
      }

      const result = await storage.getHighlights('ws1', 3);
      expect(result).toHaveLength(3);
    });
  });

  describe('Settings Management', () => {
    test('getSettings returns default settings when none exist', async () => {
      const settings = await storage.getSettings();

      expect(settings).toEqual({
        notionIntegrationEnabled: false,
        focusModeEnabled: false,
        autoSaveTabSets: false,
        theme: 'auto',
        maxHighlights: 50,
      });
    });

    test('saveSettings updates settings', async () => {
      const newSettings: Partial<Settings> = {
        focusModeEnabled: true,
        theme: 'dark',
        openaiApiKey: 'test-key',
      };

      await storage.saveSettings(newSettings);
      const settings = await storage.getSettings();

      expect(settings.focusModeEnabled).toBe(true);
      expect(settings.theme).toBe('dark');
      expect(settings.openaiApiKey).toBe('test-key');
      expect(settings.notionIntegrationEnabled).toBe(false); // Should keep default
    });

    test('saveSettings merges with existing settings', async () => {
      await storage.saveSettings({ focusModeEnabled: true });
      await storage.saveSettings({ theme: 'dark' });

      const settings = await storage.getSettings();
      expect(settings.focusModeEnabled).toBe(true);
      expect(settings.theme).toBe('dark');
    });
  });

  describe('Utility Methods', () => {
    test('clearAllData removes all data', async () => {
      // Add some data
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);
      await storage.saveSettings({ focusModeEnabled: true });

      await storage.clearAllData();

      const workspaces = await storage.listWorkspaces();
      const settings = await storage.getSettings();

      expect(workspaces).toHaveLength(0);
      expect(settings.focusModeEnabled).toBe(false); // Should be default
    });

    test('exportData returns all data', async () => {
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);
      await storage.saveSettings({ focusModeEnabled: true });

      const exportedData = await storage.exportData();

      expect(exportedData).toHaveProperty('sync');
      expect(exportedData).toHaveProperty('local');
      expect(exportedData).toHaveProperty('exportedAt');
      expect(exportedData).toHaveProperty('version');
    });

    test('importData restores data', async () => {
      const testData = {
        sync: { mv_settings: { focusModeEnabled: true } },
        local: { mv_workspaces: [{ id: 'ws1', name: 'Imported Workspace' }] },
      };

      await storage.importData(testData);

      const settings = await storage.getSettings();
      const workspaces = await storage.listWorkspaces();

      expect(settings.focusModeEnabled).toBe(true);
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].name).toBe('Imported Workspace');
    });
  });

  describe('Error Handling', () => {
    test('handles storage errors gracefully', async () => {
      // Mock storage to throw error
      vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(
        new Error('Storage error')
      );

      const workspaces = await storage.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    test('throws errors for critical operations', async () => {
      vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(
        new Error('Storage error')
      );

      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await expect(storage.saveWorkspace(workspace)).rejects.toThrow(
        'Failed to save workspace'
      );
    });
  });

  describe('Chrome Storage Usage', () => {
    test('uses chrome.storage.sync for settings', async () => {
      await storage.saveSettings({ focusModeEnabled: true });

      expect(mockStorage.sync.set).toHaveBeenCalledWith({
        mv_settings: expect.objectContaining({ focusModeEnabled: true }),
      });
    });

    test('uses chrome.storage.local for workspaces', async () => {
      const workspace: Workspace = {
        id: 'ws1',
        name: 'Test Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
      };

      await storage.saveWorkspace(workspace);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        mv_workspaces: [workspace],
      });
    });

    test('uses chrome.storage.local for tab sets', async () => {
      const tabs: TabRef[] = [
        {
          id: 'tab1',
          url: 'https://example.com',
          title: 'Example',
          pinned: false,
          index: 0,
        },
      ];

      await storage.saveTabSet('ws1', tabs);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        mv_tab_sets: expect.arrayContaining([
          expect.objectContaining({
            workspaceId: 'ws1',
            tabs,
          }),
        ]),
      });
    });
  });
});
