// Content script for text highlighting functionality
import { generateId } from '../shared/utils';

interface HighlightMessage {
  type: 'SAVE_HIGHLIGHT';
  payload: {
    text: string;
    url: string;
    title: string;
    timestamp: number;
  };
}

class HighlightCapture {
  private static readonly MIN_SELECTION_LENGTH = 10;
  private static readonly PILL_DEBOUNCE_DELAY = 300;

  private pill: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private debounceTimeout: number | null = null;
  private currentSelection: string = '';
  private isVisible = false;

  constructor() {
    this.init();
  }

  private init() {
    // Set up event listeners
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('scroll', this.handleScroll.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));

    console.log('Highlight capture initialized');
  }

  private handleMouseUp(event: MouseEvent) {
    // Clear existing debounce
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce the selection handling
    this.debounceTimeout = setTimeout(() => {
      this.processSelection(event);
    }, HighlightCapture.PILL_DEBOUNCE_DELAY) as unknown as number;
  }

  private processSelection(event: MouseEvent) {
    try {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed) {
        this.hidePill();
        return;
      }

      const selectedText = selection.toString().trim();

      // Check minimum length requirement
      if (selectedText.length < HighlightCapture.MIN_SELECTION_LENGTH) {
        this.hidePill();
        return;
      }

      // Avoid processing if selection is inside our own pill
      const range = selection.getRangeAt(0);
      if (this.pill && this.pill.contains(range.commonAncestorContainer)) {
        return;
      }

      this.currentSelection = selectedText;
      this.showPill(event, range);
    } catch (error) {
      console.warn('Error processing text selection:', error);
      this.hidePill();
    }
  }

  private showPill(event: MouseEvent, range: Range) {
    try {
      // Hide existing pill first
      this.hidePill();

      // Create pill element with shadow DOM
      this.createPill();

      if (!this.pill) return;

      // Position pill near the selection
      this.positionPill(event, range);

      // Add to document
      document.body.appendChild(this.pill);
      this.isVisible = true;

      console.log(
        'Highlight pill shown for selection:',
        this.currentSelection.substring(0, 50) + '...'
      );
    } catch (error) {
      console.warn('Error showing highlight pill:', error);
    }
  }

  private createPill() {
    try {
      // Create container element
      this.pill = document.createElement('div');
      this.pill.id = 'multiverse-highlight-pill';

      // Create shadow root for style isolation
      this.shadowRoot = this.pill.attachShadow({ mode: 'closed' });

      // Create pill content
      const pillContent = document.createElement('div');
      pillContent.className = 'pill-container';

      const button = document.createElement('button');
      button.className = 'save-button';
      button.textContent = '💾 Save highlight';
      button.title = 'Save this text to your active workspace';

      // Add click handler
      button.addEventListener('click', this.handleSaveClick.bind(this));

      pillContent.appendChild(button);

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .pill-container {
          position: fixed;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          pointer-events: auto;
        }
        
        .save-button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
          white-space: nowrap;
          line-height: 1;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .save-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }
        
        .save-button:active {
          transform: translateY(0px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .save-button:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
      `;

      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(pillContent);
    } catch (error) {
      console.warn('Error creating highlight pill:', error);
    }
  }

  private positionPill(event: MouseEvent, range: Range) {
    if (!this.pill) return;

    try {
      const rect = range.getBoundingClientRect();
      const pillWidth = 140; // Approximate pill width
      const pillHeight = 36; // Approximate pill height
      const margin = 8;

      let left = rect.left + rect.width / 2 - pillWidth / 2;
      let top = rect.bottom + margin;

      // Adjust for viewport boundaries
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Keep within horizontal bounds
      if (left < margin) {
        left = margin;
      } else if (left + pillWidth > viewportWidth - margin) {
        left = viewportWidth - pillWidth - margin;
      }

      // Keep within vertical bounds
      if (top + pillHeight > viewportHeight - margin) {
        // Position above selection if no room below
        top = rect.top - pillHeight - margin;

        // If still no room, position at bottom of viewport
        if (top < margin) {
          top = viewportHeight - pillHeight - margin;
        }
      }

      // Apply position with scroll offset
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      this.pill.style.position = 'absolute';
      this.pill.style.left = `${left + scrollX}px`;
      this.pill.style.top = `${top + scrollY}px`;
      this.pill.style.zIndex = '2147483647';
      this.pill.style.pointerEvents = 'auto';
    } catch (error) {
      console.warn('Error positioning highlight pill:', error);
    }
  }

  private async handleSaveClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (!this.currentSelection) {
        console.warn('No text selected for highlighting');
        return;
      }

      // Create highlight data
      const highlightData: HighlightMessage = {
        type: 'SAVE_HIGHLIGHT',
        payload: {
          text: this.currentSelection,
          url: window.location.href,
          title: document.title,
          timestamp: Date.now(),
        },
      };

      // Send to service worker
      await chrome.runtime.sendMessage(highlightData);

      console.log(
        'Highlight saved:',
        this.currentSelection.substring(0, 50) + '...'
      );

      // Provide user feedback
      this.showSaveConfirmation();

      // Hide pill after successful save
      setTimeout(() => {
        this.hidePill();
      }, 1500);
    } catch (error) {
      console.warn('Error saving highlight:', error);
      this.showSaveError();
    }
  }

  private showSaveConfirmation() {
    if (!this.pill || !this.shadowRoot) return;

    try {
      const button = this.shadowRoot.querySelector(
        '.save-button'
      ) as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✅ Saved!';
        button.style.background =
          'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.disabled = true;

        setTimeout(() => {
          if (button) {
            button.textContent = originalText;
            button.style.background = '';
            button.disabled = false;
          }
        }, 1000);
      }
    } catch (error) {
      console.warn('Error showing save confirmation:', error);
    }
  }

  private showSaveError() {
    if (!this.pill || !this.shadowRoot) return;

    try {
      const button = this.shadowRoot.querySelector(
        '.save-button'
      ) as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = '❌ Error';
        button.style.background =
          'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

        setTimeout(() => {
          if (button) {
            button.textContent = originalText;
            button.style.background = '';
          }
        }, 2000);
      }
    } catch (error) {
      console.warn('Error showing save error:', error);
    }
  }

  private hidePill() {
    try {
      if (this.pill && this.pill.parentNode) {
        this.pill.parentNode.removeChild(this.pill);
      }
      this.pill = null;
      this.shadowRoot = null;
      this.isVisible = false;
      this.currentSelection = '';
    } catch (error) {
      console.warn('Error hiding highlight pill:', error);
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Hide pill on ESC key
    if (event.key === 'Escape' && this.isVisible) {
      this.hidePill();
    }
  }

  private handleDocumentClick(event: MouseEvent) {
    // Hide pill when clicking elsewhere
    if (
      this.isVisible &&
      this.pill &&
      !this.pill.contains(event.target as Node)
    ) {
      this.hidePill();
    }
  }

  private handleScroll() {
    // Hide pill on scroll to avoid positioning issues
    if (this.isVisible) {
      this.hidePill();
    }
  }

  private handleResize() {
    // Hide pill on window resize
    if (this.isVisible) {
      this.hidePill();
    }
  }

  // Cleanup method
  destroy() {
    try {
      document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      document.removeEventListener(
        'click',
        this.handleDocumentClick.bind(this)
      );
      document.removeEventListener('scroll', this.handleScroll.bind(this));
      window.removeEventListener('resize', this.handleResize.bind(this));

      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      this.hidePill();

      console.log('Highlight capture destroyed');
    } catch (error) {
      console.warn('Error destroying highlight capture:', error);
    }
  }
}

// Initialize highlight capture when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HighlightCapture();
  });
} else {
  new HighlightCapture();
}

// Handle dynamic content changes
let highlightCapture: HighlightCapture;

// Initialize on content script injection
if (typeof highlightCapture === 'undefined') {
  highlightCapture = new HighlightCapture();
}

// Export for potential cleanup
(window as any).__multiverseHighlightCapture = highlightCapture;
