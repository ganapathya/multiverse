import React, { useState, useEffect } from 'react';
import { ExtensionStorage, type AppConfig } from '../shared';

const OptionsApp: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
    notionIntegrationEnabled: false,
    focusModeEnabled: false,
    autoSaveTabSets: false,
  });
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [notionApiKey, setNotionApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const storedConfig = await ExtensionStorage.get('config');
      if (storedConfig) {
        setConfig(storedConfig);
        setOpenaiApiKey(storedConfig.openaiApiKey || '');
        setNotionApiKey(storedConfig.notionApiKey || '');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const updatedConfig: AppConfig = {
        ...config,
        openaiApiKey: openaiApiKey || undefined,
        notionApiKey: notionApiKey || undefined,
      };

      await ExtensionStorage.set('config', updatedConfig);
      setConfig(updatedConfig);
      setSaveMessage('Settings saved successfully!');

      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (key: keyof AppConfig, value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Multiverse Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Configure your API keys and integration preferences.
            </p>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* API Keys Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">
                API Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Required for AI-powered features like text summarization.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notion API Key
                  </label>
                  <input
                    type="password"
                    value={notionApiKey}
                    onChange={(e) => setNotionApiKey(e.target.value)}
                    placeholder="secret_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    disabled={!config.notionIntegrationEnabled}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Required for Notion integration features.
                  </p>
                </div>
              </div>
            </div>

            {/* Integrations Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Integrations
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Notion Integration
                    </h3>
                    <p className="text-sm text-gray-500">
                      Enable saving and syncing data with Notion.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.notionIntegrationEnabled}
                      onChange={(e) =>
                        handleConfigChange(
                          'notionIntegrationEnabled',
                          e.target.checked
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* App Preferences Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">
                App Preferences
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Focus Mode
                    </h3>
                    <p className="text-sm text-gray-500">
                      Automatically enable focus mode when switching workspaces.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.focusModeEnabled}
                      onChange={(e) =>
                        handleConfigChange('focusModeEnabled', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Auto-save Tab Sets
                    </h3>
                    <p className="text-sm text-gray-500">
                      Automatically save tab sets when switching workspaces.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoSaveTabSets}
                      onChange={(e) =>
                        handleConfigChange('autoSaveTabSets', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Security Notice
                  </h3>
                  <div className="text-sm text-yellow-700 mt-2">
                    <p>
                      API keys are stored locally in your browser and are never
                      transmitted to external servers except for their intended
                      API endpoints.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            {saveMessage && (
              <div
                className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}
              >
                {saveMessage}
              </div>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                onClick={loadConfig}
                className="btn-secondary"
                disabled={isSaving}
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsApp;
