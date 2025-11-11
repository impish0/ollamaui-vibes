import { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { Trash2, Info, HardDrive, AlertCircle, CheckCircle, Loader2, Plus, RefreshCw } from 'lucide-react';
import type { OllamaModel } from '@shared/types';

export function ModelsView() {
  const { models } = useChatStore();
  const [pulling, setPulling] = useState<Record<string, boolean>>({});
  const [pullProgress, setPullProgress] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<OllamaModel | null>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePull = async (modelName: string) => {
    try {
      setError(null);
      setPulling((prev) => ({ ...prev, [modelName]: true }));
      setPullProgress((prev) => ({ ...prev, [modelName]: 'Starting download...' }));

      const eventSource = new EventSource(`/api/models/pull?name=${encodeURIComponent(modelName)}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'success') {
          setPullProgress((prev) => ({ ...prev, [modelName]: 'Complete!' }));
          setSuccess(`Model ${modelName} pulled successfully!`);
          setPulling((prev) => ({ ...prev, [modelName]: false }));
          eventSource.close();
          refreshModels();
        } else if (data.status === 'error') {
          setError(`Failed to pull ${modelName}: ${data.message}`);
          setPulling((prev) => ({ ...prev, [modelName]: false }));
          setPullProgress((prev) => ({ ...prev, [modelName]: '' }));
          eventSource.close();
        } else if (data.status) {
          setPullProgress((prev) => ({ ...prev, [modelName]: data.status }));
        }
      };

      eventSource.onerror = () => {
        setError(`Failed to pull ${modelName}`);
        setPulling((prev) => ({ ...prev, [modelName]: false }));
        setPullProgress((prev) => ({ ...prev, [modelName]: '' }));
        eventSource.close();
      };
    } catch (err) {
      console.error('Error pulling model:', err);
      setError(`Failed to pull ${modelName}`);
      setPulling((prev) => ({ ...prev, [modelName]: false }));
      setPullProgress((prev) => ({ ...prev, [modelName]: '' }));
    }
  };

  const handlePullNew = async () => {
    if (!pullModelName.trim()) return;
    await handlePull(pullModelName.trim());
    setPullModelName('');
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete ${modelName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      setDeleting(modelName);
      const response = await fetch(`/api/models/${encodeURIComponent(modelName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      setSuccess(`Model ${modelName} deleted successfully!`);
      refreshModels();
    } catch (err) {
      console.error('Error deleting model:', err);
      setError(`Failed to delete ${modelName}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleViewInfo = async (model: OllamaModel) => {
    try {
      setLoadingInfo(true);
      setSelectedModel(model);
      const response = await fetch(`/api/models/${encodeURIComponent(model.name)}/info`);

      if (!response.ok) {
        throw new Error('Failed to load model info');
      }

      const info = await response.json();
      setModelInfo(info);
    } catch (err) {
      console.error('Error loading model info:', err);
      setError(`Failed to load info for ${model.name}`);
      setSelectedModel(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  const refreshModels = async () => {
    try {
      setRefreshing(true);
      await fetch('/api/ollama/models');
      // Models will update via store
    } catch (err) {
      console.error('Error refreshing models:', err);
      setError('Failed to refresh models');
    } finally {
      setRefreshing(false);
    }
  };

  const sortedModels = [...models].sort((a, b) => a.name.localeCompare(b.name));
  const totalSize = models.reduce((sum, model) => sum + model.size, 0);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Model Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your local Ollama models - pull, delete, and view details
            </p>
          </div>
          <button
            onClick={refreshModels}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <HardDrive className="w-4 h-4" />
              <span>Total Models</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {models.length}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <HardDrive className="w-4 h-4" />
              <span>Total Size</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatBytes(totalSize)}
            </div>
          </div>
        </div>

        {/* Pull New Model */}
        <div className="mt-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={pullModelName}
              onChange={(e) => setPullModelName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePullNew()}
              placeholder="Enter model name (e.g., llama2, mistral, codellama:13b)"
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePullNew}
              disabled={!pullModelName.trim() || pulling[pullModelName.trim()]}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pulling[pullModelName.trim()] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Pull Model
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Browse available models at{' '}
            <a
              href="https://ollama.com/library"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ollama.com/library
            </a>
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-green-800 dark:text-green-200">{success}</span>
        </div>
      )}

      {/* Models List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4">
          {sortedModels.map((model) => (
            <div
              key={model.name}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {model.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{formatBytes(model.size)}</span>
                    {model.details?.family && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{model.details.family}</span>
                      </>
                    )}
                    {model.details?.parameter_size && (
                      <>
                        <span>•</span>
                        <span>{model.details.parameter_size} parameters</span>
                      </>
                    )}
                    {model.details?.quantization_level && (
                      <>
                        <span>•</span>
                        <span>{model.details.quantization_level} quant</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Modified: {new Date(model.modified_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewInfo(model)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="View Info"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(model.name)}
                    disabled={deleting === model.name}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Model"
                  >
                    {deleting === model.name ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Pull Progress */}
              {pulling[model.name] && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{pullProgress[model.name] || 'Downloading...'}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {models.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No models installed</p>
              <p className="text-sm mt-1">Pull a model to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Model Info Modal */}
      {selectedModel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedModel(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedModel.name}
              </h2>
            </div>
            <div className="p-6">
              {loadingInfo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : modelInfo ? (
                <div className="space-y-4">
                  {modelInfo.details && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Details</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Format:</span>
                          <span className="text-gray-900 dark:text-white">{modelInfo.details.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Family:</span>
                          <span className="text-gray-900 dark:text-white">{modelInfo.details.family}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Parameters:</span>
                          <span className="text-gray-900 dark:text-white">{modelInfo.details.parameter_size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Quantization:</span>
                          <span className="text-gray-900 dark:text-white">{modelInfo.details.quantization_level}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {modelInfo.license && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">License</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs">{modelInfo.license}</pre>
                      </div>
                    </div>
                  )}

                  {modelInfo.modelfile && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Modelfile</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs">{modelInfo.modelfile}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No info available</p>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedModel(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
