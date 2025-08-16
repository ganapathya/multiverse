import React, { useState, useEffect } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';
import { requireApiKey, openOptionsPage } from '../hooks/useApiValidation';
import { ToastContainer } from '../components/Toast';
import VirtualList from '../components/VirtualList';
import TasksPanel from '../components/TasksPanel';
import WorkspacePrimer from '../components/WorkspacePrimer';
import { downloadWorkspaceExport } from '../utils/workspaceExport';
import { type SavedTab } from '../shared';

const App: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    loading,
    error,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    getActiveWorkspace,
    saveCurrentTabSet,
    openWorkspaceTabSet,
    toggleFocusMode,
    workspaceTabSets,
    workspaceSavedTexts,
    focusModeEnabled,
  } = useWorkspaces();

  const { toasts, showToast, hideToast } = useToast();

  // Tasks management
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    refreshTasks,
    processTask,
    deleteTask,
  } = useTasks(activeWorkspaceId);

  // UI state
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<number | null>(null);

  const activeWorkspace = getActiveWorkspace();
  const latestTabSet = workspaceTabSets.sort(
    (a, b) => b.createdAt - a.createdAt
  )[0];

  // Load quick notes for active workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      loadQuickNotes();
    }
  }, [activeWorkspaceId]);

  const loadQuickNotes = async () => {
    try {
      // Use chrome.storage.local directly for dynamic keys
      const result = await chrome.storage.local.get([
        `quickNotes_${activeWorkspaceId}`,
      ]);
      const notes = result[`quickNotes_${activeWorkspaceId}`] as
        | string
        | undefined;
      setQuickNotes(notes || '');
    } catch (error) {
      console.error('Failed to load quick notes:', error);
    }
  };

  // Auto-save quick notes with debounce
  useEffect(() => {
    if (!activeWorkspaceId) return;

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        // Use chrome.storage.local directly for dynamic keys
        await chrome.storage.local.set({
          [`quickNotes_${activeWorkspaceId}`]: quickNotes,
        });
      } catch (error) {
        console.error('Failed to save quick notes:', error);
      }
    }, 1000) as unknown as number;

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [quickNotes, activeWorkspaceId]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreatingWorkspace(false);
      showToast('Workspace created successfully!', 'success');
    } catch (error) {
      showToast('Failed to create workspace', 'error');
    }
  };

  const handleRenameWorkspace = async () => {
    if (!activeWorkspace || !newWorkspaceName.trim()) return;

    try {
      await renameWorkspace(activeWorkspace.id, newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsRenamingWorkspace(false);
      showToast('Workspace renamed successfully!', 'success');
    } catch (error) {
      showToast('Failed to rename workspace', 'error');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;

    if (
      !confirm(`Are you sure you want to delete "${activeWorkspace.name}"?`)
    ) {
      return;
    }

    try {
      await deleteWorkspace(activeWorkspace.id);
      showToast('Workspace deleted successfully!', 'success');
    } catch (error) {
      showToast('Failed to delete workspace', 'error');
    }
  };

  const handleSaveCurrentTabs = async () => {
    try {
      await saveCurrentTabSet();
      showToast('Current tabs saved!', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save tabs',
        'error'
      );
    }
  };

  const handleOpenWorkspaceTabs = async () => {
    try {
      await openWorkspaceTabSet();
      showToast('Workspace tabs opened!', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to open tabs',
        'error'
      );
    }
  };

  const handleToggleFocusMode = async () => {
    try {
      await toggleFocusMode();
      showToast(
        focusModeEnabled ? 'Focus mode disabled' : 'Focus mode enabled',
        'success'
      );
    } catch (error) {
      showToast('Failed to toggle focus mode', 'error');
    }
  };

  const handleSummarizeHighlights = async () => {
    const hasApiKey = await requireApiKey((message) => {
      showToast(message, 'warning');
    });

    if (!hasApiKey) {
      // Show options page link in toast
      setTimeout(() => {
        showToast('Click here to configure your API key', 'info');
      }, 500);
      return;
    }

    try {
      // Show loading state
      showToast('Analyzing highlights...', 'info');

      // TODO: Implement actual summarization logic
      // This would send the highlights to the background script for OpenAI processing

      // For now, show placeholder
      setTimeout(() => {
        showToast('Summarization feature coming soon!', 'info');
      }, 1500);
    } catch (error) {
      showToast('Failed to summarize highlights', 'error');
    }
  };

  const handleOpenOptions = () => {
    openOptionsPage();
  };

  // Task handlers
  const handleProcessTask = async (taskId: string) => {
    try {
      showToast('Processing task...', 'info');
      await processTask(taskId);
      showToast('Task completed successfully!', 'success');
    } catch (error) {
      showToast('Failed to process task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      showToast('Task deleted', 'success');
    } catch (error) {
      showToast('Failed to delete task', 'error');
    }
  };

  // Workspace primer handler
  const handleUpdatePrimer = async (primer: string) => {
    if (!activeWorkspaceId) return;

    try {
      const currentWorkspace = getActiveWorkspace();
      if (!currentWorkspace) return;

      const updatedWorkspace = {
        ...currentWorkspace,
        contextPrimer: primer || undefined, // Store undefined instead of empty string
        updatedAt: Date.now(),
      };

      await renameWorkspace(activeWorkspaceId, updatedWorkspace.name); // This will trigger a save

      // We need to directly update the workspace with the primer
      const { storage } = await import('../shared');
      await storage.saveWorkspace(updatedWorkspace);

      showToast('Primer updated', 'success');
    } catch (error) {
      console.error('Failed to update primer:', error);
      showToast('Failed to update primer', 'error');
    }
  };

  // Export handler
  const handleExportWorkspace = async () => {
    if (!activeWorkspaceId || !activeWorkspace) return;

    try {
      showToast('Preparing export...', 'info');

      await downloadWorkspaceExport(activeWorkspaceId);

      showToast(
        `Workspace "${activeWorkspace.name}" exported successfully!`,
        'success'
      );
    } catch (error) {
      console.error('Failed to export workspace:', error);
      showToast('Failed to export workspace', 'error');
    }
  };

  const renderTabItem = (tab: SavedTab, _index: number) => (
    <div className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-lg">
      {tab.favIconUrl && (
        <img src={tab.favIconUrl} alt="" className="w-4 h-4 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {tab.title}
        </div>
        <div className="text-xs text-gray-500 truncate">{tab.url}</div>
      </div>
      {tab.pinned && (
        <div
          className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"
          title="Pinned"
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="w-[380px] h-[600px] bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[380px] h-[600px] bg-white flex items-center justify-center">
        <div className="text-red-500 text-center">
          <div className="font-medium">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[380px] h-[600px] bg-white flex flex-col">
      <ToastContainer toasts={toasts} onHide={hideToast} />

      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Multiverse</h1>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleOpenOptions}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Workspace Dropdown and Actions */}
        <div className="space-y-3">
          <div className="relative">
            <select
              value={activeWorkspaceId || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">Select workspace...</option>
              {workspaces.map((workspace) => (
                <option
                  key={workspace.id}
                  value={workspace.id}
                  className="text-gray-900"
                >
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsCreatingWorkspace(true);
                setNewWorkspaceName('');
              }}
              className="flex-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              + New
            </button>
            <button
              onClick={() => {
                if (activeWorkspace) {
                  setIsRenamingWorkspace(true);
                  setNewWorkspaceName(activeWorkspace.name);
                }
              }}
              disabled={!activeWorkspace}
              className="flex-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Rename
            </button>
            <button
              onClick={handleDeleteWorkspace}
              disabled={!activeWorkspace}
              className="flex-1 bg-red-500/80 hover:bg-red-500 border border-red-400/50 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Create/Rename Workspace Modal */}
      {(isCreatingWorkspace || isRenamingWorkspace) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
            <h3 className="text-lg font-medium mb-4">
              {isCreatingWorkspace ? 'Create Workspace' : 'Rename Workspace'}
            </h3>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  isCreatingWorkspace
                    ? handleCreateWorkspace()
                    : handleRenameWorkspace();
                }
              }}
              autoFocus
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  setIsCreatingWorkspace(false);
                  setIsRenamingWorkspace(false);
                  setNewWorkspaceName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  isCreatingWorkspace
                    ? handleCreateWorkspace
                    : handleRenameWorkspace
                }
                disabled={!newWorkspaceName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isCreatingWorkspace ? 'Create' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {!activeWorkspace ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-lg font-medium mb-2">
              No workspace selected
            </div>
            <div className="text-sm">
              Create or select a workspace to get started
            </div>
          </div>
        ) : (
          <>
            {/* Workspace Primer */}
            <WorkspacePrimer
              workspace={activeWorkspace}
              onUpdate={handleUpdatePrimer}
            />

            {/* Tabs in this workspace */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Tabs in this workspace ({latestTabSet?.tabs.length || 0})
              </h2>
              {latestTabSet && latestTabSet.tabs.length > 0 ? (
                <div className="border rounded-lg">
                  <VirtualList
                    items={latestTabSet.tabs}
                    itemHeight={60}
                    height={120}
                    renderItem={renderTabItem}
                    className="border-gray-200"
                  />
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                  <div className="text-sm">No tabs saved yet</div>
                  <div className="text-xs mt-1">
                    Save your current tabs to see them here
                  </div>
                </div>
              )}
            </section>

            {/* Action Buttons */}
            <section>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handleSaveCurrentTabs}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Save Current Tabs
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenWorkspaceTabs}
                    disabled={!latestTabSet}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Open Workspace Tabs
                  </button>
                  <button
                    onClick={handleToggleFocusMode}
                    className={`${
                      focusModeEnabled
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm`}
                  >
                    {focusModeEnabled ? 'Exit Focus' : 'Focus Mode'}
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Notes */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Notes (sync)
              </h2>
              <textarea
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Add quick notes for this workspace..."
                className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="text-xs text-gray-500 mt-1">
                Auto-saves as you type
              </div>
            </section>

            {/* Saved Highlights */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Saved Highlights ({workspaceSavedTexts.length})
                </h2>
                {workspaceSavedTexts.length > 0 && (
                  <button
                    onClick={handleSummarizeHighlights}
                    className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors flex items-center space-x-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span>Summarize</span>
                  </button>
                )}
              </div>
              {workspaceSavedTexts.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {workspaceSavedTexts.map((savedText) => (
                    <div
                      key={savedText.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {savedText.text}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {savedText.title} •{' '}
                        {new Date(savedText.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                  <div className="text-sm">No highlights saved yet</div>
                  <div className="text-xs mt-1">
                    Select text on any page to save it here
                  </div>
                </div>
              )}
            </section>

            {/* AI Tasks Panel */}
            <section>
              <TasksPanel
                tasks={tasks}
                loading={tasksLoading}
                error={tasksError}
                onProcessTask={handleProcessTask}
                onDeleteTask={handleDeleteTask}
                onRefresh={refreshTasks}
              />
            </section>

            {/* Export Actions */}
            <section>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Export & Sync
                  </h3>
                  <div className="text-xs text-gray-500">
                    Save workspace data
                  </div>
                </div>

                <div className="space-y-2">
                  {/* JSON Export */}
                  <button
                    onClick={handleExportWorkspace}
                    disabled={!activeWorkspace}
                    className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Export Workspace JSON</span>
                  </button>

                  {/* Notion Export (Future) */}
                  <button
                    disabled={true}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed"
                    title="Notion integration coming soon"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Export to Notion</span>
                    <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  </button>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      Export includes: tabs, highlights, tasks, notes, and AI
                      primer
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
