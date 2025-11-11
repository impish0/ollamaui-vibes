import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { toastUtils } from '../../utils/toast';

interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
  enabled: boolean;
}

const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4, GPT-4 Turbo, GPT-3.5 Turbo',
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    enabled: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    description: 'Claude 3 Opus, Sonnet, Haiku',
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    enabled: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    description: 'Ultra-fast inference with Llama, Mixtral',
    apiKeyLabel: 'Groq API Key',
    apiKeyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    enabled: false,
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '🔍',
    description: 'Gemini Pro, Gemini Ultra',
    apiKeyLabel: 'Google AI API Key',
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://makersuite.google.com/app/apikey',
    enabled: false,
  },
];

export function ProviderSettings() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/providers/keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const handleSave = async (providerId: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/providers/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: apiKeys[providerId] || '',
        }),
      });

      if (response.ok) {
        toastUtils.success(`${PROVIDERS.find((p) => p.id === providerId)?.name} API key saved`);
      } else {
        throw new Error('Failed to save API key');
      }
    } catch (error) {
      toastUtils.error('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (providerId: string) => {
    if (!apiKeys[providerId]) {
      toastUtils.error('Please enter an API key first');
      return;
    }

    setTesting((prev) => ({ ...prev, [providerId]: true }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    try {
      const response = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: apiKeys[providerId],
        }),
      });

      if (response.ok) {
        setTestResults((prev) => ({ ...prev, [providerId]: 'success' }));
        toastUtils.success('API key is valid!');
      } else {
        setTestResults((prev) => ({ ...prev, [providerId]: 'error' }));
        toastUtils.error('API key is invalid');
      }
    } catch (error) {
      setTestResults((prev) => ({ ...prev, [providerId]: 'error' }));
      toastUtils.error('Failed to test API key');
    } finally {
      setTesting((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleDelete = async (providerId: string) => {
    const confirmed = confirm(`Remove API key for ${PROVIDERS.find((p) => p.id === providerId)?.name}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/providers/keys/${providerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys((prev) => {
          const updated = { ...prev };
          delete updated[providerId];
          return updated;
        });
        setTestResults((prev) => ({ ...prev, [providerId]: null }));
        toastUtils.success('API key removed');
      }
    } catch (error) {
      toastUtils.error('Failed to remove API key');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Providers</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Connect external AI providers to use their models alongside your local Ollama models
        </p>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const hasKey = Boolean(apiKeys[provider.id]);
          const isVisible = showKeys[provider.id];
          const isTesting = testing[provider.id];
          const testResult = testResults[provider.id];

          return (
            <div
              key={provider.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{provider.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {provider.name}
                      {hasKey && testResult === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {provider.description}
                    </p>
                  </div>
                </div>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
                >
                  Get API Key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* API Key Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {provider.apiKeyLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) =>
                        setApiKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                      placeholder={provider.apiKeyPlaceholder}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSave(provider.id)}
                    disabled={!apiKeys[provider.id] || saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>

                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={!apiKeys[provider.id] || isTesting}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>

                  {hasKey && (
                    <button
                      onClick={() => handleDelete(provider.id)}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}

                  {testResult && (
                    <div className="ml-auto flex items-center gap-2">
                      {testResult === 'success' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Valid</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Invalid</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">How it works</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• API keys are stored securely and encrypted</li>
          <li>• Once configured, provider models will appear in model selectors</li>
          <li>• You can use API models in Chat and Playground alongside Ollama models</li>
          <li>• API usage costs will be tracked and displayed</li>
          <li>• Remove API keys anytime to disable provider integration</li>
        </ul>
      </div>
    </div>
  );
}
