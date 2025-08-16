import React from 'react';
import { type Task } from '../hooks/useTasks';

interface TasksPanelProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onProcessTask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const TasksPanel: React.FC<TasksPanelProps> = ({
  tasks,
  loading,
  error,
  onProcessTask,
  onDeleteTask,
  onRefresh,
}) => {
  const handleProcessTask = async (taskId: string) => {
    try {
      await onProcessTask(taskId);
    } catch (error) {
      console.error('Failed to process task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await onDeleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'queued':
        return (
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'processing':
        return (
          <svg
            className="w-4 h-4 text-yellow-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        );
      case 'completed':
        return (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const getTaskTypeText = (type: Task['type']) => {
    switch (type) {
      case 'summarize_selection':
        return 'Text Selection';
      case 'summarize_page':
        return 'Page Content';
      default:
        return type;
    }
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-sm text-gray-500">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          AI Tasks ({tasks.length})
        </h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-red-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
          <svg
            className="w-8 h-8 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <div className="text-sm">No AI tasks yet</div>
          <div className="text-xs mt-1">
            Right-click on web pages and select "Summarize in current workspace"
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              {/* Task Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(task.status)}
                  <span className="text-xs font-medium text-gray-600">
                    {getTaskTypeText(task.type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getStatusText(task.status)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {task.status === 'queued' && (
                    <button
                      onClick={() => handleProcessTask(task.id)}
                      className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                      title="Process this task"
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
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10V7a2 2 0 012-2h2a2 2 0 012 2v3"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete task"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Task Content */}
              <div className="text-sm text-gray-900 mb-2">
                <div className="font-medium text-xs text-gray-500 mb-1">
                  {task.title}
                </div>
                <div className="line-clamp-2">{truncateText(task.content)}</div>
              </div>

              {/* Task Result */}
              {task.status === 'completed' && task.result && (
                <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                  <div className="text-xs font-medium text-green-800 mb-1">
                    Summary:
                  </div>
                  <div className="text-xs text-green-700 mb-2 line-clamp-2">
                    {task.result.summary}
                  </div>
                  {task.result.key_points.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-800 mb-1">
                        Key Points:
                      </div>
                      <ul className="text-xs text-green-700 space-y-1">
                        {task.result.key_points
                          .slice(0, 3)
                          .map((point, index) => (
                            <li key={index} className="line-clamp-1">
                              • {point}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Task Error */}
              {task.status === 'failed' && task.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <div className="text-xs font-medium text-red-800 mb-1">
                    Error:
                  </div>
                  <div className="text-xs text-red-700 line-clamp-2">
                    {task.error}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-400 mt-2">
                {new Date(task.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksPanel;
