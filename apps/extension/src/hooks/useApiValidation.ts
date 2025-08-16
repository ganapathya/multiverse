import { useState, useEffect } from 'react';
import { storage, type Settings } from '../shared';

interface ApiValidationResult {
  hasApiKey: boolean;
  settings: Settings | null;
  isLoading: boolean;
  validateApiKey: () => Promise<boolean>;
  showApiKeyMissingMessage: () => string;
}

export function useApiValidation(): ApiValidationResult {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    try {
      const currentSettings = await storage.getSettings();
      setSettings(currentSettings);
      setHasApiKey(!!currentSettings.openaiApiKey);
    } catch (error) {
      console.error('Failed to load API key status:', error);
      setHasApiKey(false);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateApiKey = async (): Promise<boolean> => {
    await loadApiKeyStatus();
    return hasApiKey;
  };

  const showApiKeyMissingMessage = (): string => {
    return 'OpenAI API key is required for AI features. Please configure it in the Options page.';
  };

  return {
    hasApiKey,
    settings,
    isLoading,
    validateApiKey,
    showApiKeyMissingMessage,
  };
}

// Utility function for popup actions that require API key
export async function requireApiKey(onMissingKey: (message: string) => void): Promise<boolean> {
  try {
    const settings = await storage.getSettings();
    const hasKey = !!settings.openaiApiKey;
    
    if (!hasKey) {
      onMissingKey('OpenAI API key is required for AI features. Please configure it in the Options page.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to validate API key:', error);
    onMissingKey('Failed to validate API configuration. Please check your settings.');
    return false;
  }
}

// Utility function to open options page
export function openOptionsPage(): void {
  try {
    chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('Failed to open options page:', error);
    // Fallback: open in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
}
