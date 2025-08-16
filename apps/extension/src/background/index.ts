import { storage, type TabRef, type Workspace } from '../shared';

// Task types for summarization queue
interface Task {
  id: string;
  type: 'summarize_selection' | 'summarize_page';
  workspaceId: string;
  content: string;
  url: string;
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

// Focus mode storage
interface FocusModeState {
  enabled: boolean;
  sleepingTabs: Array<{
    id: number;
    url: string;
    title: string;
    pinned: boolean;
    index: number;
    windowId: number;
  }>;
}

class BackgroundScript {
  private focusModeState: FocusModeState = {
    enabled: false,
    sleepingTabs: [],
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Set up event listeners
      chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
      chrome.contextMenus.onClicked.addListener(
        this.handleContextMenuClick.bind(this)
      );
      chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Load focus mode state
      await this.loadFocusModeState();

      console.log('Background script initialized');
    } catch (error) {
      console.warn('Failed to initialize background script:', error);
    }
  }

  private async handleInstalled() {
    try {
      console.log('Extension installed');

      // Remove existing context menus first
      await chrome.contextMenus.removeAll();

      // Create context menu for summarization
      await chrome.contextMenus.create({
        id: 'summarize_current_selection',
        title: 'Summarize in current workspace',
        contexts: ['selection', 'page'],
      });

      console.log('Context menu created successfully');

      // Initialize default data
      await this.initializeDefaultData();
    } catch (error) {
      console.warn('Failed to handle installation:', error);
    }
  }

  private async initializeDefaultData() {
    try {
      // Check if we have any existing workspaces
      const workspaces = await storage.listWorkspaces();

      if (workspaces.length === 0) {
        // Create a default workspace
        const defaultWorkspace: Workspace = {
          id: `ws_${Date.now()}`,
          name: 'Default Workspace',
          description: 'Your default workspace for browsing',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isActive: true,
        };

        await storage.saveWorkspace(defaultWorkspace);
        await storage.setActiveWorkspace(defaultWorkspace.id);

        console.log('Created default workspace');
      }
    } catch (error) {
      console.warn('Failed to initialize default data:', error);
    }
  }

  private async handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    try {
      if (info.menuItemId === 'summarize_current_selection') {
        await this.handleSummarizeAction(info, tab);
      }
    } catch (error) {
      console.warn('Failed to handle context menu click:', error);
    }
  }

  private async handleSummarizeAction(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    try {
      if (!tab?.id || !tab.url) {
        console.warn('No valid tab for context menu action');
        return;
      }

      // Get active workspace
      const activeWorkspaceId = await storage.getActiveWorkspace();
      if (!activeWorkspaceId) {
        console.warn('No active workspace for summarization');
        this.showNotification('Please select a workspace first');
        return;
      }

      let content = '';
      let taskType: Task['type'] = 'summarize_page';

      // Try to get selection text first
      if (info.selectionText) {
        content = info.selectionText;
        taskType = 'summarize_selection';
      } else {
        // Fallback to extracting page content
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Extract meaningful text content from the page
              const selection = window.getSelection()?.toString();
              if (selection && selection.trim()) {
                return selection.trim();
              }

              // Fallback to page title and some content
              const title = document.title;
              const metaDescription =
                document
                  .querySelector('meta[name="description"]')
                  ?.getAttribute('content') || '';
              const firstParagraph =
                document.querySelector('p')?.textContent || '';

              return [title, metaDescription, firstParagraph]
                .filter(Boolean)
                .join('\n\n')
                .slice(0, 1000); // Limit content
            },
          });

          if (results?.[0]?.result) {
            content = results[0].result;
          }
        } catch (scriptError) {
          console.warn('Failed to extract content from page:', scriptError);
          content = `Page: ${tab.title || 'Untitled'}\nURL: ${tab.url}`;
        }
      }

      if (!content.trim()) {
        console.warn('No content found for summarization');
        this.showNotification('No content found to summarize');
        return;
      }

      // Create task record
      const task: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: taskType,
        workspaceId: activeWorkspaceId,
        content: content.trim(),
        url: tab.url,
        title: tab.title || 'Untitled',
        status: 'queued',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store task
      await this.saveTask(task);

      const actionText =
        taskType === 'summarize_selection' ? 'Selected text' : 'Page content';
      this.showNotification(`${actionText} queued for summarization`);

      console.log('Summarization task created:', task.id);
    } catch (error) {
      console.warn('Failed to handle summarization action:', error);
      this.showNotification('Failed to queue summarization task');
    }
  }

  private handleTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) {
    try {
      if (changeInfo.status === 'complete' && tab.title) {
        console.log(`Tab updated: ${tab.title}`);
      }
    } catch (error) {
      console.warn('Error handling tab update:', error);
    }
  }

  private async handleMessage(
    message: {
      action?: string;
      type?: string;
      data?: unknown;
      payload?: unknown;
    },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) {
    try {
      const messageType = message.action || message.type;
      console.log('Message received:', messageType);

      switch (messageType) {
        case 'SAVE_HIGHLIGHT':
          await this.handleSaveHighlight(
            message.payload as {
              text: string;
              url: string;
              title: string;
              timestamp: number;
            }
          );
          sendResponse({ success: true });
          break;
        case 'saveCurrentTabSet':
          const saveResult = await this.saveCurrentTabSet(
            message.data as { workspaceId: string; name?: string }
          );
          sendResponse({ success: true, tabSetId: saveResult });
          break;

        case 'openWorkspaceTabSet':
          const openResult = await this.openWorkspaceTabSet(
            message.data as { tabSetId: string }
          );
          sendResponse({ success: true, tabs: openResult });
          break;

        case 'toggleFocusMode':
          await this.toggleFocusMode(message.data as { workspaceId: string });
          sendResponse({ success: true, enabled: this.focusModeState.enabled });
          break;

        case 'getTasks':
          const tasks = await this.getTasks(
            message.data as { workspaceId: string }
          );
          sendResponse({ success: true, tasks });
          break;

        case 'updateTask':
          await this.updateTask(
            message.data as { taskId: string; updates: Partial<Task> }
          );
          sendResponse({ success: true });
          break;

        case 'getFocusModeState':
          sendResponse({ success: true, state: this.focusModeState });
          break;

        default:
          console.warn('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.warn('Failed to handle message:', error);
      sendResponse({ success: false, error: error.message });
    }

    // Return true to indicate we'll respond asynchronously
    return true;
  }

  // Highlight Management
  private async handleSaveHighlight(payload: {
    text: string;
    url: string;
    title: string;
    timestamp: number;
  }) {
    try {
      // Get active workspace
      const activeWorkspaceId = await storage.getActiveWorkspace();
      if (!activeWorkspaceId) {
        console.warn('No active workspace for highlight save');
        this.showNotification('Please select a workspace first');
        return;
      }

      // Create highlight record
      const highlight = {
        id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: payload.text,
        url: payload.url,
        title: payload.title,
        createdAt: payload.timestamp,
      };

      // Save to storage
      await storage.appendHighlight(activeWorkspaceId, highlight);

      console.log('Highlight saved:', highlight.id);
      this.showNotification('Highlight saved to workspace');
    } catch (error) {
      console.warn('Failed to save highlight:', error);
      this.showNotification('Failed to save highlight');
    }
  }

  // Tab Set Management
  async saveCurrentTabSet(data: { workspaceId: string; name?: string }) {
    try {
      // Query current window tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });

      // Convert to TabRef format
      const tabRefs: TabRef[] = tabs
        .filter((tab) => tab.url && !tab.url.startsWith('chrome://'))
        .map((tab) => ({
          id: `tab_${tab.id}_${Date.now()}`,
          url: tab.url || '',
          title: tab.title || 'Untitled',
          favIconUrl: tab.favIconUrl,
          pinned: tab.pinned || false,
          index: tab.index,
        }));

      // Save to storage
      const tabSetId = await storage.saveTabSet(
        data.workspaceId,
        tabRefs,
        data.name || `Tab Set ${new Date().toLocaleString()}`
      );

      console.log(`Saved tab set ${tabSetId} with ${tabRefs.length} tabs`);
      this.showNotification(`Saved ${tabRefs.length} tabs to workspace`);

      return tabSetId;
    } catch (error) {
      console.warn('Failed to save current tab set:', error);
      this.showNotification('Failed to save tabs');
      throw error;
    }
  }

  async openWorkspaceTabSet(data: { tabSetId: string }) {
    try {
      // Get tab set from storage
      const tabSet = await storage.getTabSet(data.tabSetId);
      if (!tabSet) {
        console.warn('Tab set not found:', data.tabSetId);
        this.showNotification('Tab set not found');
        return [];
      }

      // Get current window
      const currentWindow = await chrome.windows.getCurrent();

      // Create tabs in order
      const createdTabs = [];
      for (const [index, tabRef] of tabSet.tabs.entries()) {
        try {
          const tab = await chrome.tabs.create({
            windowId: currentWindow.id,
            url: tabRef.url,
            pinned: tabRef.pinned,
            active: index === 0, // Make first tab active
          });
          createdTabs.push(tab);
        } catch (tabError) {
          console.warn(`Failed to create tab for ${tabRef.url}:`, tabError);
        }
      }

      console.log(
        `Opened tab set ${data.tabSetId} with ${createdTabs.length} tabs`
      );
      this.showNotification(`Opened ${createdTabs.length} tabs from workspace`);

      return createdTabs;
    } catch (error) {
      console.warn('Failed to open workspace tab set:', error);
      this.showNotification('Failed to open tabs');
      throw error;
    }
  }

  // Focus Mode Implementation
  async toggleFocusMode(data: { workspaceId: string }) {
    try {
      if (this.focusModeState.enabled) {
        // Disable focus mode - restore sleeping tabs
        await this.disableFocusMode();
      } else {
        // Enable focus mode - hide non-workspace tabs
        await this.enableFocusMode(data.workspaceId);
      }

      // Save state
      await this.saveFocusModeState();

      const statusText = this.focusModeState.enabled ? 'enabled' : 'disabled';
      console.log(`Focus mode ${statusText}`);
      this.showNotification(`Focus mode ${statusText}`);
    } catch (error) {
      console.warn('Failed to toggle focus mode:', error);
      this.showNotification('Failed to toggle focus mode');
      throw error;
    }
  }

  private async enableFocusMode(workspaceId: string) {
    try {
      // Get current tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });

      // Get workspace tab sets to determine which tabs belong to workspace
      const tabSets = await storage.getWorkspaceTabSets(workspaceId);
      const workspaceUrls = new Set<string>();

      tabSets.forEach((tabSet) => {
        tabSet.tabs.forEach((tab) => {
          workspaceUrls.add(tab.url);
        });
      });

      // Identify tabs that don't belong to current workspace
      const nonWorkspaceTabs = tabs.filter(
        (tab) =>
          tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://') &&
          !workspaceUrls.has(tab.url)
      );

      // Store sleeping tabs info
      this.focusModeState.sleepingTabs = nonWorkspaceTabs.map((tab) => ({
        id: tab.id!,
        url: tab.url!,
        title: tab.title || 'Untitled',
        pinned: tab.pinned || false,
        index: tab.index,
        windowId: tab.windowId!,
      }));

      // Close non-workspace tabs
      const tabIdsToClose = nonWorkspaceTabs.map((tab) => tab.id!);
      if (tabIdsToClose.length > 0) {
        await chrome.tabs.remove(tabIdsToClose);
      }

      this.focusModeState.enabled = true;

      console.log(
        `Focus mode enabled, closed ${tabIdsToClose.length} non-workspace tabs`
      );
    } catch (error) {
      console.warn('Failed to enable focus mode:', error);
      throw error;
    }
  }

  private async disableFocusMode() {
    try {
      // Restore sleeping tabs
      const currentWindow = await chrome.windows.getCurrent();
      const restoredTabs = [];

      for (const sleepingTab of this.focusModeState.sleepingTabs) {
        try {
          const tab = await chrome.tabs.create({
            windowId: currentWindow.id,
            url: sleepingTab.url,
            pinned: sleepingTab.pinned,
            active: false,
          });
          restoredTabs.push(tab);
        } catch (tabError) {
          console.warn(`Failed to restore tab ${sleepingTab.url}:`, tabError);
        }
      }

      // Clear sleeping tabs
      const restoredCount = this.focusModeState.sleepingTabs.length;
      this.focusModeState.sleepingTabs = [];
      this.focusModeState.enabled = false;

      console.log(`Focus mode disabled, restored ${restoredCount} tabs`);
      return restoredTabs;
    } catch (error) {
      console.warn('Failed to disable focus mode:', error);
      throw error;
    }
  }

  // Task Management
  private async saveTask(task: Task) {
    try {
      const existingTasks = await this.getAllTasks();
      existingTasks.push(task);
      await chrome.storage.local.set({ mv_tasks: existingTasks });
    } catch (error) {
      console.warn('Failed to save task:', error);
      throw error;
    }
  }

  private async getTasks(data: { workspaceId: string }): Promise<Task[]> {
    try {
      const allTasks = await this.getAllTasks();
      return allTasks.filter((task) => task.workspaceId === data.workspaceId);
    } catch (error) {
      console.warn('Failed to get tasks:', error);
      return [];
    }
  }

  private async updateTask(data: { taskId: string; updates: Partial<Task> }) {
    try {
      const allTasks = await this.getAllTasks();
      const taskIndex = allTasks.findIndex((task) => task.id === data.taskId);

      if (taskIndex >= 0) {
        allTasks[taskIndex] = {
          ...allTasks[taskIndex],
          ...data.updates,
          updatedAt: Date.now(),
        };
        await chrome.storage.local.set({ mv_tasks: allTasks });
      }
    } catch (error) {
      console.warn('Failed to update task:', error);
      throw error;
    }
  }

  private async getAllTasks(): Promise<Task[]> {
    try {
      const result = await chrome.storage.local.get(['mv_tasks']);
      return result.mv_tasks || [];
    } catch (error) {
      console.warn('Failed to get all tasks:', error);
      return [];
    }
  }

  // Focus Mode State Management
  private async loadFocusModeState() {
    try {
      const result = await chrome.storage.local.get(['mv_focus_mode_state']);
      if (result.mv_focus_mode_state) {
        this.focusModeState = result.mv_focus_mode_state;
      }
    } catch (error) {
      console.warn('Failed to load focus mode state:', error);
    }
  }

  private async saveFocusModeState() {
    try {
      await chrome.storage.local.set({
        mv_focus_mode_state: this.focusModeState,
      });
    } catch (error) {
      console.warn('Failed to save focus mode state:', error);
    }
  }

  private showNotification(message: string) {
    try {
      chrome.notifications.create(
        {
          type: 'basic',
          iconUrl: 'icons/icon-48.svg',
          title: 'Multiverse',
          message,
        },
        () => {
          if (chrome.runtime.lastError) {
            // Fallback: show badge text if notifications aren't available
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
            setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
          }
        }
      );
    } catch (error) {
      console.warn('Failed to show notification:', error);
      // Fallback: show badge text
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    }
  }
}

// Initialize the background script
new BackgroundScript();
