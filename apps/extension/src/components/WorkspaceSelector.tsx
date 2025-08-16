import React from 'react';
import { ExtensionStorage, type Workspace } from '../shared';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  onWorkspaceChange: (workspaceId: string | undefined) => void;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
}) => {
  const handleWorkspaceSelect = async (workspaceId: string) => {
    try {
      await ExtensionStorage.set('activeWorkspaceId', workspaceId);
      onWorkspaceChange(workspaceId);
    } catch (error) {
      console.error('Failed to set active workspace:', error);
    }
  };

  if (workspaces.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>No workspaces yet.</p>
        <p className="text-sm">Create one below to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Active Workspace
      </label>
      <select
        value={activeWorkspaceId || ''}
        onChange={(e) => handleWorkspaceSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">Select a workspace...</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WorkspaceSelector;
