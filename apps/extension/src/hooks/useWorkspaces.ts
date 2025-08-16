import { useState, useEffect, useCallback } from 'react';
import {
  ExtensionStorage,
  createWorkspace,
  type Workspace,
  type TabSet,
  type SavedText,
} from '../shared';

export interface UseWorkspacesReturn {
  // State
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;

  // Workspace management
  getWorkspaces: () => Promise<Workspace[]>;
  createWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (id: string, newName: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  getActiveWorkspace: () => Workspace | null;

  // Tab management
  saveCurrentTabSet: (name?: string) => Promise<void>;
  openWorkspaceTabSet: (tabSetId?: string) => Promise<void>;
  toggleFocusMode: () => Promise<void>;

  // Data for current workspace
  workspaceTabSets: TabSet[];
  workspaceSavedTexts: SavedText[];
  focusModeEnabled: boolean;
}

export function useWorkspaces(): UseWorkspacesReturn {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
  const [workspaceTabSets, setWorkspaceTabSets] = useState<TabSet[]>([]);
  const [workspaceSavedTexts, setWorkspaceSavedTexts] = useState<SavedText[]>(
    []
  );
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Load workspace-specific data when active workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceData(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [workspacesData, activeId, config] = await Promise.all([
        ExtensionStorage.get('workspaces'),
        ExtensionStorage.get('activeWorkspaceId'),
        ExtensionStorage.get('config'),
      ]);

      setWorkspaces(workspacesData || []);
      setActiveWorkspaceIdState(activeId || null);
      setFocusModeEnabled(config?.focusModeEnabled || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceData = async (workspaceId: string) => {
    try {
      // Use new storage system for loading workspace data
      const { storage } = await import('../shared');

      const [tabSets, highlights] = await Promise.all([
        storage.getWorkspaceTabSets(workspaceId),
        storage.getHighlights(workspaceId, 10), // Latest 10 highlights
      ]);

      setWorkspaceTabSets(tabSets);

      // Convert highlights to SavedText format for compatibility
      const savedTexts = highlights.map((highlight) => ({
        id: highlight.id,
        text: highlight.text,
        url: highlight.url,
        title: highlight.title,
        workspaceId: workspaceId,
        createdAt: highlight.createdAt,
      }));

      setWorkspaceSavedTexts(savedTexts);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    }
  };

  const getWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    const data = await ExtensionStorage.get('workspaces');
    return data || [];
  }, []);

  const createWorkspaceHandler = useCallback(
    async (name: string): Promise<void> => {
      try {
        const newWorkspace = createWorkspace(name);
        const updatedWorkspaces = [...workspaces, newWorkspace];

        // Optimistic update
        setWorkspaces(updatedWorkspaces);

        await ExtensionStorage.set('workspaces', updatedWorkspaces);
      } catch (err) {
        // Revert optimistic update
        await loadData();
        throw err;
      }
    },
    [workspaces]
  );

  const renameWorkspace = useCallback(
    async (id: string, newName: string): Promise<void> => {
      try {
        const updatedWorkspaces = workspaces.map((w) =>
          w.id === id ? { ...w, name: newName, updatedAt: Date.now() } : w
        );

        // Optimistic update
        setWorkspaces(updatedWorkspaces);

        await ExtensionStorage.set('workspaces', updatedWorkspaces);
      } catch (err) {
        // Revert optimistic update
        await loadData();
        throw err;
      }
    },
    [workspaces]
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<void> => {
      try {
        const updatedWorkspaces = workspaces.filter((w) => w.id !== id);

        // Optimistic update
        setWorkspaces(updatedWorkspaces);

        // Clear active workspace if it's being deleted
        if (activeWorkspaceId === id) {
          setActiveWorkspaceIdState(null);
          await ExtensionStorage.remove('activeWorkspaceId');
        }

        await ExtensionStorage.set('workspaces', updatedWorkspaces);
      } catch (err) {
        // Revert optimistic update
        await loadData();
        throw err;
      }
    },
    [workspaces, activeWorkspaceId]
  );

  const setActiveWorkspace = useCallback(async (id: string): Promise<void> => {
    try {
      // Optimistic update
      setActiveWorkspaceIdState(id);

      await ExtensionStorage.set('activeWorkspaceId', id);
    } catch (err) {
      // Revert optimistic update
      await loadData();
      throw err;
    }
  }, []);

  const getActiveWorkspace = useCallback((): Workspace | null => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || null;
  }, [workspaces, activeWorkspaceId]);

  const saveCurrentTabSet = useCallback(
    async (name?: string): Promise<void> => {
      if (!activeWorkspaceId) {
        throw new Error('No active workspace selected');
      }

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'saveCurrentTabSet',
          data: {
            workspaceId: activeWorkspaceId,
            name: name || `Tab Set ${new Date().toLocaleString()}`,
          },
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to save tab set');
        }

        // Refresh workspace data to show new tab set
        await loadWorkspaceData(activeWorkspaceId);

        console.log('Tab set saved successfully:', response.tabSetId);
      } catch (err) {
        console.error('Failed to save current tab set:', err);
        throw err;
      }
    },
    [activeWorkspaceId, loadWorkspaceData]
  );

  const openWorkspaceTabSet = useCallback(
    async (tabSetId?: string): Promise<void> => {
      try {
        // If no specific tab set, use the most recent one
        const targetTabSetId =
          tabSetId ||
          workspaceTabSets.sort((a, b) => b.createdAt - a.createdAt)[0]?.id;

        if (!targetTabSetId) {
          throw new Error('No tab set found for this workspace');
        }

        const response = await chrome.runtime.sendMessage({
          action: 'openWorkspaceTabSet',
          data: { tabSetId: targetTabSetId },
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to open tab set');
        }

        console.log(
          'Tab set opened successfully:',
          response.tabs?.length,
          'tabs'
        );
      } catch (err) {
        console.error('Failed to open workspace tab set:', err);
        throw err;
      }
    },
    [workspaceTabSets]
  );

  const toggleFocusMode = useCallback(async (): Promise<void> => {
    if (!activeWorkspaceId) {
      throw new Error('No active workspace selected');
    }

    try {
      const newEnabled = !focusModeEnabled;

      // Optimistic update
      setFocusModeEnabled(newEnabled);

      const response = await chrome.runtime.sendMessage({
        action: 'toggleFocusMode',
        data: { workspaceId: activeWorkspaceId },
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle focus mode');
      }

      // Update with actual state from background script
      setFocusModeEnabled(response.enabled);

      console.log('Focus mode toggled to:', response.enabled);
    } catch (err) {
      // Revert optimistic update
      setFocusModeEnabled(!focusModeEnabled);
      console.error('Failed to toggle focus mode:', err);
      throw err;
    }
  }, [activeWorkspaceId, focusModeEnabled]);

  return {
    // State
    workspaces,
    activeWorkspaceId,
    loading,
    error,

    // Workspace management
    getWorkspaces,
    createWorkspace: createWorkspaceHandler,
    renameWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    getActiveWorkspace,

    // Tab management
    saveCurrentTabSet,
    openWorkspaceTabSet,
    toggleFocusMode,

    // Data for current workspace
    workspaceTabSets,
    workspaceSavedTexts,
    focusModeEnabled,
  };
}
