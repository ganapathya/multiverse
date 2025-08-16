import React, { useState, useEffect } from 'react';
import { ExtensionStorage } from '../shared';

interface FocusModeProps {
  activeWorkspaceId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ activeWorkspaceId }) => {
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [hiddenTabIds, setHiddenTabIds] = useState<number[]>([]);

  useEffect(() => {
    loadFocusMode();
  }, []);

  const loadFocusMode = async () => {
    try {
      const config = await ExtensionStorage.get('config');
      setFocusModeEnabled(config?.focusModeEnabled || false);
    } catch (error) {
      console.error('Failed to load focus mode config:', error);
    }
  };

  const handleToggleFocusMode = async () => {
    if (!activeWorkspaceId) return;

    try {
      const newEnabled = !focusModeEnabled;

      if (newEnabled) {
        // Enable focus mode - hide non-workspace tabs
        // const allTabs = await chrome.tabs.query({});
        const tabsToHide: number[] = [];

        // For now, we'll just simulate hiding tabs (actual hiding would require more complex logic)
        // In a real implementation, you'd store workspace-tab associations

        setHiddenTabIds(tabsToHide);
      } else {
        // Disable focus mode - restore hidden tabs
        setHiddenTabIds([]);
      }

      const config = (await ExtensionStorage.get('config')) || {
        notionIntegrationEnabled: false,
        focusModeEnabled: false,
        autoSaveTabSets: false,
      };

      await ExtensionStorage.set('config', {
        ...config,
        focusModeEnabled: newEnabled,
      });

      setFocusModeEnabled(newEnabled);
    } catch (error) {
      console.error('Failed to toggle focus mode:', error);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Select a workspace to use Focus Mode.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Focus Mode
        </label>
        <p className="text-sm text-gray-600">
          Hide tabs that don't belong to the current workspace.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
        <div className="flex-1">
          <div className="font-medium text-sm">
            {focusModeEnabled ? 'Focus Mode Active' : 'Focus Mode Inactive'}
          </div>
          <div className="text-xs text-gray-500">
            {focusModeEnabled
              ? `${hiddenTabIds.length} tabs hidden`
              : 'All tabs visible'}
          </div>
        </div>
        <button
          onClick={handleToggleFocusMode}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            focusModeEnabled
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {focusModeEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {focusModeEnabled && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Focus Mode Actions
          </div>
          <button
            onClick={() => {
              // Restore all hidden tabs
              setHiddenTabIds([]);
            }}
            className="btn-secondary w-full text-sm"
          >
            Restore All Hidden Tabs
          </button>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div className="text-sm font-medium text-yellow-800">
          Feature Preview
        </div>
        <div className="text-xs text-yellow-700 mt-1">
          Focus Mode is currently in preview. Tab hiding/showing functionality
          will be fully implemented in a future version.
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
