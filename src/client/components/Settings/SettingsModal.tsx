import { useState, useEffect } from 'react';
import { useSettings, useUpdateSettings, useResetCategory } from '../../hooks/useSettingsQuery';
import { useModels } from '../../hooks/useModelsQuery';
import { useSystemPrompts } from '../../hooks/useSystemPromptsQuery';
import type { AppSettings } from '../../../shared/settings';
import { Skeleton } from '../UI/Skeleton';
import { ProviderSettings } from './ProviderSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'titleGeneration' | 'model' | 'ui' | 'general' | 'advanced' | 'providers';

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('titleGeneration');
  const [formData, setFormData] = useState<Partial<AppSettings>>({});

  const { data: settings, isLoading } = useSettings();
  const { data: models } = useModels();
  const { data: systemPrompts } = useSystemPrompts();
  const updateSettings = useUpdateSettings();
  const resetCategory = useResetCategory();

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings.mutateAsync(formData);
  };

  const handleReset = async () => {
    if (activeTab === 'providers') return; // Providers has its own management
    if (confirm(`Reset ${activeTab} settings to defaults?`)) {
      await resetCategory.mutateAsync(activeTab as keyof AppSettings);
      if (settings) {
        setFormData(settings);
      }
    }
  };

  const updateField = <K extends keyof AppSettings>(
    category: K,
    key: keyof AppSettings[K],
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }));
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'titleGeneration', label: 'Title Generation', icon: '✏️' },
    { id: 'model', label: 'Model Defaults', icon: '🤖' },
    { id: 'providers', label: 'API Providers', icon: '🔌' },
    { id: 'ui', label: 'UI Preferences', icon: '🎨' },
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Panel */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton variant="text" className="h-8 w-48" />
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-3/4" />
                <Skeleton variant="rectangular" className="h-32 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {activeTab === 'titleGeneration' && (
                  <TitleGenerationSettings
                    data={formData.titleGeneration || settings?.titleGeneration}
                    onChange={(key, value) => updateField('titleGeneration', key, value)}
                  />
                )}

                {activeTab === 'model' && (
                  <ModelDefaultsSettings
                    data={formData.model || settings?.model}
                    onChange={(key, value) => updateField('model', key, value)}
                    models={models}
                    systemPrompts={systemPrompts}
                  />
                )}

                {activeTab === 'ui' && (
                  <UIPreferencesSettings
                    data={formData.ui || settings?.ui}
                    onChange={(key, value) => updateField('ui', key, value)}
                  />
                )}

                {activeTab === 'general' && (
                  <GeneralSettings
                    data={formData.general || settings?.general}
                    onChange={(key, value) => updateField('general', key, value)}
                  />
                )}

                {activeTab === 'advanced' && (
                  <AdvancedSettings
                    data={formData.advanced || settings?.advanced}
                    onChange={(key, value) => updateField('advanced', key, value)}
                  />
                )}

                {activeTab === 'providers' && (
                  <ProviderSettings />
                )}

                {/* Actions - Hide for providers tab (has its own save) */}
                {activeTab !== 'providers' && (
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Reset to Defaults
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateSettings.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                      >
                        {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Title Generation Settings Panel
const TitleGenerationSettings = ({
  data,
  onChange,
}: {
  data: any;
  onChange: (key: keyof AppSettings['titleGeneration'], value: any) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Title Generation</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Configure how chat titles are automatically generated
      </p>
    </div>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.enabled ?? true}
        onChange={(e) => onChange('enabled', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Enable automatic title generation
      </span>
    </label>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Generation Prompt
      </label>
      <textarea
        value={data?.prompt ?? ''}
        onChange={(e) => onChange('prompt', e.target.value)}
        rows={6}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Use {conversation} as a placeholder for the conversation context"
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{'{conversation}'}</code> as
        a placeholder
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Trigger After Messages
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={data?.triggerAfterMessages ?? 2}
          onChange={(e) => onChange('triggerAfterMessages', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Generate title after N messages</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Regenerate After Messages
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={data?.regenerateAfterMessages ?? 0}
          onChange={(e) => onChange('regenerateAfterMessages', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">0 = disabled, 6-8 recommended</p>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Length</label>
      <input
        type="number"
        min="10"
        max="200"
        value={data?.maxLength ?? 60}
        onChange={(e) => onChange('maxLength', parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Maximum title length in characters</p>
    </div>
  </div>
);

// Model Defaults Settings Panel
const ModelDefaultsSettings = ({
  data,
  onChange,
  models,
  systemPrompts,
}: {
  data: any;
  onChange: (key: keyof AppSettings['model'], value: any) => void;
  models: any;
  systemPrompts: any;
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Model Defaults</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Set default model parameters for new chats
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Model</label>
      <select
        value={data?.defaultModel ?? ''}
        onChange={(e) => onChange('defaultModel', e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">First available model</option>
        {models?.map((model: any) => (
          <option key={model.name} value={model.name}>
            {model.name}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Default System Prompt
      </label>
      <select
        value={data?.defaultSystemPromptId ?? ''}
        onChange={(e) => onChange('defaultSystemPromptId', e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">None</option>
        {systemPrompts?.map((prompt: any) => (
          <option key={prompt.id} value={prompt.id}>
            {prompt.name}
          </option>
        ))}
      </select>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temperature</label>
        <input
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={data?.temperature ?? 0.7}
          onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">0 = focused, 2 = creative</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top P</label>
        <input
          type="number"
          min="0"
          max="1"
          step="0.1"
          value={data?.topP ?? 0.9}
          onChange={(e) => onChange('topP', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nucleus sampling threshold</p>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Context Window</label>
      <select
        value={data?.contextWindow ?? 'auto'}
        onChange={(e) => onChange('contextWindow', e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="auto">Auto (scales 8K-128K)</option>
        <option value="8192">8K tokens</option>
        <option value="16384">16K tokens</option>
        <option value="32768">32K tokens</option>
        <option value="65536">64K tokens</option>
        <option value="131072">128K tokens</option>
      </select>
    </div>
  </div>
);

// UI Preferences Settings Panel
const UIPreferencesSettings = ({
  data,
  onChange,
}: {
  data: any;
  onChange: (key: keyof AppSettings['ui'], value: any) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">UI Preferences</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">Customize the look and feel of the interface</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
      <select
        value={data?.theme ?? 'system'}
        onChange={(e) => onChange('theme', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.autoScroll ?? true}
        onChange={(e) => onChange('autoScroll', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-scroll to new messages</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.showTimestamps ?? false}
        onChange={(e) => onChange('showTimestamps', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show message timestamps</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.sidebarDefaultOpen ?? true}
        onChange={(e) => onChange('sidebarDefaultOpen', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sidebar open by default</span>
    </label>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Density</label>
      <select
        value={data?.messageDisplayDensity ?? 'comfortable'}
        onChange={(e) => onChange('messageDisplayDensity', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="comfortable">Comfortable</option>
        <option value="compact">Compact</option>
      </select>
    </div>
  </div>
);

// General Settings Panel
const GeneralSettings = ({
  data,
  onChange,
}: {
  data: any;
  onChange: (key: keyof AppSettings['general'], value: any) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">General Settings</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">Basic application configuration</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Ollama Base URL
      </label>
      <input
        type="url"
        value={data?.ollamaBaseUrl ?? 'http://localhost:11434'}
        onChange={(e) => onChange('ollamaBaseUrl', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="http://localhost:11434"
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">URL of your Ollama server</p>
    </div>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.autoSave ?? true}
        onChange={(e) => onChange('autoSave', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-save chats</span>
    </label>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Message History Limit
      </label>
      <input
        type="number"
        min="0"
        value={data?.messageHistoryLimit ?? 0}
        onChange={(e) => onChange('messageHistoryLimit', parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">0 = unlimited</p>
    </div>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.enableMarkdownRendering ?? true}
        onChange={(e) => onChange('enableMarkdownRendering', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable markdown rendering</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.enableSyntaxHighlighting ?? true}
        onChange={(e) => onChange('enableSyntaxHighlighting', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable syntax highlighting</span>
    </label>
  </div>
);

// Advanced Settings Panel
const AdvancedSettings = ({
  data,
  onChange,
}: {
  data: any;
  onChange: (key: keyof AppSettings['advanced'], value: any) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Advanced Settings</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Advanced configuration for power users
      </p>
    </div>

    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        ⚠️ Changing these settings may affect performance and stability
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stream Timeout (ms)
        </label>
        <input
          type="number"
          min="1000"
          max="600000"
          step="1000"
          value={data?.streamTimeout ?? 120000}
          onChange={(e) => onChange('streamTimeout', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chunk Timeout (ms)
        </label>
        <input
          type="number"
          min="1000"
          max="60000"
          step="1000"
          value={data?.chunkTimeout ?? 30000}
          onChange={(e) => onChange('chunkTimeout', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logging Level</label>
      <select
        value={data?.loggingLevel ?? 'info'}
        onChange={(e) => onChange('loggingLevel', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="debug">Debug</option>
        <option value="info">Info</option>
        <option value="warn">Warn</option>
        <option value="error">Error</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Model Polling Interval (ms)
      </label>
      <input
        type="number"
        min="5000"
        max="60000"
        step="1000"
        value={data?.modelPollingInterval ?? 15000}
        onChange={(e) => onChange('modelPollingInterval', parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={data?.enableDebugMode ?? false}
        onChange={(e) => onChange('enableDebugMode', e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable debug mode</span>
    </label>
  </div>
);
