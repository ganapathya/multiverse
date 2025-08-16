import type { Workspace, TabSet, SavedTab } from './types.js';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new workspace
 */
export function createWorkspace(name: string): Workspace {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    isActive: false,
  };
}

/**
 * Create a new tab set from current tabs
 */
export function createTabSet(
  workspaceId: string,
  name: string,
  tabs: chrome.tabs.Tab[]
): TabSet {
  const now = Date.now();
  const savedTabs: SavedTab[] = tabs
    .filter((tab) => tab.url && !tab.url.startsWith('chrome://'))
    .map((tab, index) => ({
      id: generateId(),
      url: tab.url!,
      title: tab.title || 'Untitled',
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned || false,
      index,
    }));

  return {
    id: generateId(),
    workspaceId,
    name,
    tabs: savedTabs,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return (
      !url.startsWith('chrome://') && !url.startsWith('chrome-extension://')
    );
  } catch {
    return false;
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait) as unknown as number;
  };
}

/**
 * Compare workspaces for sorting
 */
export function compareWorkspaces(a: Workspace, b: Workspace): number {
  if (a.isActive && !b.isActive) return -1;
  if (!a.isActive && b.isActive) return 1;
  return b.updatedAt - a.updatedAt;
}
