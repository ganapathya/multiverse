import { ExtensionStorage, type ContextMenuData } from '../shared';

class BackgroundScript {
  constructor() {
    this.init();
  }

  private init() {
    // Initialize extension
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener(
      this.handleContextMenuClick.bind(this)
    );

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));

    console.log('Multiverse background script loaded');
  }

  private handleInstalled(details: chrome.runtime.InstalledDetails) {
    console.log('Extension installed:', details.reason);

    // Create context menus
    this.createContextMenus();

    // Initialize default data if needed
    this.initializeDefaultData();
  }

  private createContextMenus() {
    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      // Create "Summarize in current workspace" menu
      chrome.contextMenus.create({
        id: 'summarize-in-workspace',
        title: 'Summarize in current workspace',
        contexts: ['selection'],
      });

      // Create "Save to workspace" menu
      chrome.contextMenus.create({
        id: 'save-to-workspace',
        title: 'Save to workspace',
        contexts: ['selection'],
      });

      // Create separator
      chrome.contextMenus.create({
        id: 'separator',
        type: 'separator',
        contexts: ['selection'],
      });

      // Create "Open Multiverse" menu
      chrome.contextMenus.create({
        id: 'open-multiverse',
        title: 'Open Multiverse',
        contexts: ['page', 'selection'],
      });
    });
  }

  private async initializeDefaultData() {
    try {
      // Initialize empty data structures if they don't exist
      const [workspaces, tabSets, savedTexts, config] = await Promise.all([
        ExtensionStorage.get('workspaces'),
        ExtensionStorage.get('tabSets'),
        ExtensionStorage.get('savedTexts'),
        ExtensionStorage.get('config'),
      ]);

      if (!workspaces) {
        await ExtensionStorage.set('workspaces', []);
      }

      if (!tabSets) {
        await ExtensionStorage.set('tabSets', []);
      }

      if (!savedTexts) {
        await ExtensionStorage.set('savedTexts', []);
      }

      if (!config) {
        await ExtensionStorage.set('config', {
          notionIntegrationEnabled: false,
          focusModeEnabled: false,
          autoSaveTabSets: false,
        });
      }
    } catch (error) {
      console.error('Failed to initialize default data:', error);
    }
  }

  private async handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    switch (info.menuItemId) {
      case 'summarize-in-workspace':
        await this.handleSummarizeInWorkspace(info, tab);
        break;
      case 'save-to-workspace':
        await this.handleSaveToWorkspace(info, tab);
        break;
      case 'open-multiverse':
        await this.handleOpenMultiverse();
        break;
    }
  }

  private async handleSummarizeInWorkspace(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    try {
      const activeWorkspaceId = await ExtensionStorage.get('activeWorkspaceId');

      if (!activeWorkspaceId) {
        this.showNotification('Please select a workspace first');
        return;
      }

      const contextData: ContextMenuData = {
        selectionText: info.selectionText || '',
        pageUrl: info.pageUrl || tab?.url || '',
        pageTitle: tab?.title || '',
      };

      // For now, just show a placeholder notification
      // In a real implementation, this would call OpenAI API to summarize
      this.showNotification('Summarization feature coming soon!');

      console.log('Summarize request:', contextData);
    } catch (error) {
      console.error('Failed to summarize:', error);
      this.showNotification('Failed to summarize text');
    }
  }

  private async handleSaveToWorkspace(
    _info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    try {
      if (!tab?.id) return;

      // Send message to content script to save selected text
      await chrome.tabs.sendMessage(tab.id, {
        action: 'saveSelectedText',
      });
    } catch (error) {
      console.error('Failed to save to workspace:', error);
      this.showNotification('Failed to save text');
    }
  }

  private async handleOpenMultiverse() {
    try {
      // Open popup by opening the extension action
      await chrome.action.openPopup();
    } catch (error) {
      // If popup can't be opened, open options page instead
      await chrome.runtime.openOptionsPage();
    }
  }

  private handleTabUpdated(
    _tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) {
    // Handle tab updates (for future features like auto-organizing tabs)
    if (changeInfo.status === 'complete' && tab.url) {
      // Could implement auto-categorization or workspace suggestions here
      console.log('Tab updated:', tab.url);
    }
  }

  private handleMessage(
    message: { action: string; data?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) {
    switch (message.action) {
      case 'getActiveWorkspace':
        this.handleGetActiveWorkspace(sendResponse);
        break;
      case 'updateContextMenus':
        this.createContextMenus();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ error: 'Unknown action' });
    }

    // Return true to indicate we'll respond asynchronously
    return true;
  }

  private async handleGetActiveWorkspace(
    sendResponse: (response: unknown) => void
  ) {
    try {
      const activeWorkspaceId = await ExtensionStorage.get('activeWorkspaceId');
      const workspaces = (await ExtensionStorage.get('workspaces')) || [];
      const activeWorkspace = workspaces.find(
        (w) => w.id === activeWorkspaceId
      );

      sendResponse({ activeWorkspace });
    } catch (error) {
      console.error('Failed to get active workspace:', error);
      sendResponse({ error: 'Failed to get active workspace' });
    }
  }

  private showNotification(message: string) {
    try {
      chrome.notifications.create(
        {
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Multiverse',
          message,
        },
        () => {
          // Notification created successfully
        }
      );
    } catch {
      // Fallback: show badge text if notifications aren't available
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    }
  }
}

// Initialize background script
new BackgroundScript();
