import React, { useState, useEffect } from 'react';
import { ExtensionStorage, createTabSet, type TabSet } from '../shared';

interface TabSetManagerProps {
  activeWorkspaceId?: string;
}

const TabSetManager: React.FC<TabSetManagerProps> = ({ activeWorkspaceId }) => {
  const [tabSets, setTabSets] = useState<TabSet[]>([]);
  const [newTabSetName, setNewTabSetName] = useState('');

  useEffect(() => {
    loadTabSets();
  }, [activeWorkspaceId]);

  const loadTabSets = async () => {
    try {
      const allTabSets = (await ExtensionStorage.get('tabSets')) || [];
      const workspaceTabSets = activeWorkspaceId
        ? allTabSets.filter((ts) => ts.workspaceId === activeWorkspaceId)
        : [];
      setTabSets(workspaceTabSets);
    } catch (error) {
      console.error('Failed to load tab sets:', error);
    }
  };

  const handleSaveCurrentTabs = async () => {
    if (!activeWorkspaceId || !newTabSetName.trim()) return;

    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const newTabSet = createTabSet(
        activeWorkspaceId,
        newTabSetName.trim(),
        tabs
      );

      const allTabSets = (await ExtensionStorage.get('tabSets')) || [];
      const updatedTabSets = [...allTabSets, newTabSet];

      await ExtensionStorage.set('tabSets', updatedTabSets);
      setNewTabSetName('');
      loadTabSets();
    } catch (error) {
      console.error('Failed to save tab set:', error);
    }
  };

  const handleRestoreTabSet = async (tabSet: TabSet) => {
    try {
      for (const tab of tabSet.tabs) {
        await chrome.tabs.create({
          url: tab.url,
          pinned: tab.pinned,
        });
      }
    } catch (error) {
      console.error('Failed to restore tab set:', error);
    }
  };

  const handleDeleteTabSet = async (tabSetId: string) => {
    if (!confirm('Are you sure you want to delete this tab set?')) return;

    try {
      const allTabSets = (await ExtensionStorage.get('tabSets')) || [];
      const updatedTabSets = allTabSets.filter((ts) => ts.id !== tabSetId);

      await ExtensionStorage.set('tabSets', updatedTabSets);
      loadTabSets();
    } catch (error) {
      console.error('Failed to delete tab set:', error);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Select a workspace to manage tab sets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Save current tabs */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Save Current Tabs
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTabSetName}
            onChange={(e) => setNewTabSetName(e.target.value)}
            placeholder="Tab set name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleSaveCurrentTabs()}
          />
          <button
            onClick={handleSaveCurrentTabs}
            disabled={!newTabSetName.trim()}
            className="btn-primary text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>

      {/* Tab sets list */}
      {tabSets.length > 0 ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Saved Tab Sets ({tabSets.length})
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tabSets.map((tabSet) => (
              <div
                key={tabSet.id}
                className="p-3 border border-gray-200 rounded-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{tabSet.name}</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleRestoreTabSet(tabSet)}
                      className="text-primary-600 hover:text-primary-700 text-xs"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeleteTabSet(tabSet.id)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {tabSet.tabs.length} tabs •{' '}
                  {new Date(tabSet.createdAt).toLocaleDateString()}
                </div>
                <div className="max-h-20 overflow-y-auto">
                  {tabSet.tabs.slice(0, 3).map((tab, index) => (
                    <div key={index} className="text-xs text-gray-600 truncate">
                      • {tab.title}
                    </div>
                  ))}
                  {tabSet.tabs.length > 3 && (
                    <div className="text-xs text-gray-400">
                      ... and {tabSet.tabs.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <p>No saved tab sets yet.</p>
          <p className="text-sm">Save your current tabs above!</p>
        </div>
      )}
    </div>
  );
};

export default TabSetManager;
