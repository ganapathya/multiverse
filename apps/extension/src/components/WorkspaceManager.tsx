import React, { useState } from 'react';
import { ExtensionStorage, createWorkspace, type Workspace } from '../shared';

interface WorkspaceManagerProps {
  workspaces: Workspace[];
  onWorkspacesChange: (workspaces: Workspace[]) => void;
  onDataReload: () => void;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  workspaces,
  onWorkspacesChange,
  onDataReload,
}) => {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const newWorkspace = createWorkspace(newWorkspaceName.trim());
      const updatedWorkspaces = [...workspaces, newWorkspace];

      await ExtensionStorage.set('workspaces', updatedWorkspaces);
      onWorkspacesChange(updatedWorkspaces);
      setNewWorkspaceName('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleRenameWorkspace = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const updatedWorkspaces = workspaces.map((w) =>
        w.id === id
          ? { ...w, name: editingName.trim(), updatedAt: Date.now() }
          : w
      );

      await ExtensionStorage.set('workspaces', updatedWorkspaces);
      onWorkspacesChange(updatedWorkspaces);
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to rename workspace:', error);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    try {
      const updatedWorkspaces = workspaces.filter((w) => w.id !== id);
      await ExtensionStorage.set('workspaces', updatedWorkspaces);
      onWorkspacesChange(updatedWorkspaces);
      onDataReload(); // Reload to update active workspace if deleted
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  const startEditing = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditingName(workspace.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      {/* Create new workspace */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Create New Workspace
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Workspace name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
          />
          <button
            onClick={handleCreateWorkspace}
            disabled={!newWorkspaceName.trim()}
            className="btn-primary text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>

      {/* Workspace list */}
      {workspaces.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Manage Workspaces
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="flex items-center justify-between p-2 border border-gray-200 rounded-md"
              >
                {editingId === workspace.id ? (
                  <div className="flex flex-1 space-x-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter')
                          handleRenameWorkspace(workspace.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameWorkspace(workspace.id)}
                      className="text-green-600 hover:text-green-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">
                      {workspace.name}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditing(workspace)}
                        className="text-primary-600 hover:text-primary-700 text-xs"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceManager;
