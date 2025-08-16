import { useState, useEffect, useCallback } from 'react';

// Task types (matching background script)
export interface Task {
  id: string;
  type: 'summarize_selection' | 'summarize_page';
  workspaceId: string;
  content: string;
  url: string;
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: string;
  result?: {
    summary: string;
    key_points: string[];
    actions: string[];
  };
}

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  processTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export function useTasks(workspaceId: string | null): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    if (!workspaceId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({
        action: 'getTasks',
        data: { workspaceId },
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tasks');
      }

      setTasks(response.tasks || []);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const processTask = useCallback(
    async (taskId: string) => {
      try {
        // Find the task to process
        const task = tasks.find((t) => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        // Optimistic update
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, status: 'processing' as const } : t
          )
        );

        // Process the task using AI actions
        const { summarizeInContext } = await import('../popup/aiActions');
        const { storage } = await import('../shared');

        // Get the workspace for context
        const workspace = await storage.getWorkspace(task.workspaceId);
        if (!workspace) {
          throw new Error('Workspace not found');
        }

        // Call the AI service
        const result = await summarizeInContext({
          text: task.content,
          workspace,
        });

        // Update the task with the result
        const updateResponse = await chrome.runtime.sendMessage({
          action: 'updateTask',
          data: {
            taskId: taskId,
            updates: {
              status: 'completed',
              result: result,
              updatedAt: Date.now(),
            },
          },
        });

        if (!updateResponse.success) {
          throw new Error(updateResponse.error || 'Failed to update task');
        }

        // Update local state
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'completed' as const,
                  result,
                  updatedAt: Date.now(),
                }
              : t
          )
        );
      } catch (err) {
        console.error('Failed to process task:', err);

        // Update task with error
        const errorMessage =
          err instanceof Error ? err.message : 'Processing failed';

        try {
          await chrome.runtime.sendMessage({
            action: 'updateTask',
            data: {
              taskId: taskId,
              updates: {
                status: 'failed',
                error: errorMessage,
                updatedAt: Date.now(),
              },
            },
          });
        } catch (updateError) {
          console.error('Failed to update task with error:', updateError);
        }

        // Update local state with error
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'failed' as const,
                  error: errorMessage,
                  updatedAt: Date.now(),
                }
              : t
          )
        );

        throw err;
      }
    },
    [tasks]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        // Optimistic update
        setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));

        // Delete from storage (we'll need to implement this in the background script)
        const response = await chrome.runtime.sendMessage({
          action: 'deleteTask',
          data: { taskId },
        });

        if (!response.success) {
          // Revert optimistic update
          await refreshTasks();
          throw new Error(response.error || 'Failed to delete task');
        }
      } catch (err) {
        console.error('Failed to delete task:', err);
        throw err;
      }
    },
    [refreshTasks]
  );

  // Load tasks when workspace changes
  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // Auto-refresh tasks periodically
  useEffect(() => {
    const interval = setInterval(refreshTasks, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshTasks]);

  return {
    tasks,
    loading,
    error,
    refreshTasks,
    processTask,
    deleteTask,
  };
}
