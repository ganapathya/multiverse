import React, { useState, useEffect } from 'react';
import { ExtensionStorage, type Workspace } from '../shared';
import WorkspaceSelector from '../components/WorkspaceSelector';
import WorkspaceManager from '../components/WorkspaceManager';
import TabSetManager from '../components/TabSetManager';
import FocusMode from '../components/FocusMode';

const App: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<
    string | undefined
  >();
  const [currentTab, setCurrentTab] = useState<'workspaces' | 'tabs' | 'focus'>(
    'workspaces'
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workspacesData, activeId] = await Promise.all([
        ExtensionStorage.get('workspaces'),
        ExtensionStorage.get('activeWorkspaceId'),
      ]);

      setWorkspaces(workspacesData || []);
      setActiveWorkspaceId(activeId);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div className="w-full h-full bg-white">
      <div className="bg-primary-500 text-white p-4">
        <h1 className="text-lg font-semibold">Multiverse</h1>
        <p className="text-sm opacity-90">
          {activeWorkspace
            ? `Active: ${activeWorkspace.name}`
            : 'No active workspace'}
        </p>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setCurrentTab('workspaces')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'workspaces'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Workspaces
        </button>
        <button
          onClick={() => setCurrentTab('tabs')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'tabs'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tab Sets
        </button>
        <button
          onClick={() => setCurrentTab('focus')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'focus'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Focus
        </button>
      </div>

      <div className="p-4 space-y-4">
        {currentTab === 'workspaces' && (
          <>
            <WorkspaceSelector
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onWorkspaceChange={setActiveWorkspaceId}
            />
            <WorkspaceManager
              workspaces={workspaces}
              onWorkspacesChange={setWorkspaces}
              onDataReload={loadData}
            />
          </>
        )}

        {currentTab === 'tabs' && (
          <TabSetManager activeWorkspaceId={activeWorkspaceId} />
        )}

        {currentTab === 'focus' && (
          <FocusMode activeWorkspaceId={activeWorkspaceId} />
        )}
      </div>

      <div className="border-t p-4">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="btn-secondary w-full text-sm"
        >
          Settings
        </button>
      </div>
    </div>
  );
};

export default App;
