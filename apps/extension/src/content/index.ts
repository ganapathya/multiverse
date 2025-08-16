import { ExtensionStorage, generateId, type SavedText } from '../shared';

class ContentScript {
  private selectedText = '';
  private selectionTimeout: number | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for text selection
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    console.log('Multiverse content script loaded');
  }

  private handleMouseUp = () => {
    this.checkSelection();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    // Check selection on arrow keys and other navigation keys
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(event.key)
    ) {
      this.checkSelection();
    }
  };

  private checkSelection() {
    // Clear previous timeout
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }

    // Debounce selection check
    this.selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';

      if (selectedText && selectedText !== this.selectedText) {
        this.selectedText = selectedText;
        this.showSelectionTooltip(selectedText);
      } else if (!selectedText) {
        this.hideSelectionTooltip();
        this.selectedText = '';
      }
    }, 300);
  }

  private showSelectionTooltip(text: string) {
    // Remove existing tooltip
    this.hideSelectionTooltip();

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'multiverse-selection-tooltip';
    tooltip.innerHTML = `
      <button id="multiverse-save-selection" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
      ">
        Save to Multiverse
      </button>
    `;

    // Style tooltip
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '10000';
    tooltip.style.pointerEvents = 'auto';

    // Position tooltip near selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    }

    document.body.appendChild(tooltip);

    // Add click handler
    const saveButton = tooltip.querySelector('#multiverse-save-selection');
    saveButton?.addEventListener('click', () => this.saveSelectedText(text));

    // Hide tooltip after delay
    setTimeout(() => this.hideSelectionTooltip(), 5000);
  }

  private hideSelectionTooltip() {
    const existingTooltip = document.getElementById(
      'multiverse-selection-tooltip'
    );
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }

  private async saveSelectedText(text: string) {
    try {
      // Get active workspace
      const activeWorkspaceId = await ExtensionStorage.get('activeWorkspaceId');

      if (!activeWorkspaceId) {
        this.showNotification('Please select a workspace first', 'error');
        return;
      }

      // Create saved text entry
      const savedText: SavedText = {
        id: generateId(),
        workspaceId: activeWorkspaceId,
        text,
        url: window.location.href,
        title: document.title,
        createdAt: Date.now(),
        tags: [],
      };

      // Save to storage
      const existingSavedTexts =
        (await ExtensionStorage.get('savedTexts')) || [];
      const updatedSavedTexts = [...existingSavedTexts, savedText];
      await ExtensionStorage.set('savedTexts', updatedSavedTexts);

      this.hideSelectionTooltip();
      this.showNotification('Text saved to workspace!', 'success');

      // Clear selection
      window.getSelection()?.removeAllRanges();
      this.selectedText = '';
    } catch (error) {
      console.error('Failed to save selected text:', error);
      this.showNotification('Failed to save text', 'error');
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    // Remove existing notification
    const existingNotification = document.getElementById(
      'multiverse-notification'
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification
    const notification = document.createElement('div');
    notification.id = 'multiverse-notification';
    notification.textContent = message;

    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10001';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '8px';
    notification.style.fontSize = '14px';
    notification.style.fontWeight = '500';
    notification.style.color = 'white';
    notification.style.backgroundColor =
      type === 'success' ? '#10b981' : '#ef4444';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'transform 0.3s ease-in-out';

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-hide
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private handleMessage(
    message: { action: string; data?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) {
    switch (message.action) {
      case 'getSelectedText':
        sendResponse({ selectedText: this.selectedText });
        break;
      case 'saveSelectedText':
        if (this.selectedText) {
          this.saveSelectedText(this.selectedText);
        }
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize content script
new ContentScript();
