import { useState, useRef, useEffect } from 'react';
import { useAllModels, UnifiedModel } from '../../hooks/useAllModels';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelector = ({ selectedModel, onModelChange, disabled }: ModelSelectorProps) => {
  const { data: models = [], refetch: refreshModels } = useAllModels();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const formatModelSize = (bytes?: number) => {
    if (!bytes) return null;
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      ollama: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      openai: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      anthropic: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      groq: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      google: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[provider] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  // Filter models based on search query
  const filteredModels = models.filter((model) => {
    const search = searchQuery.toLowerCase();
    return (
      model.name.toLowerCase().includes(search) ||
      model.provider.toLowerCase().includes(search)
    );
  });

  // Group models by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, UnifiedModel[]>);

  const providerOrder = ['ollama', 'openai', 'anthropic', 'groq', 'google'];
  const sortedProviders = Object.keys(groupedModels).sort(
    (a, b) => providerOrder.indexOf(a) - providerOrder.indexOf(b)
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm font-medium">{selectedModel || 'Select Model'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* Header with search and refresh */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className="w-full px-3 py-2 pl-9 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                onClick={() => refreshModels()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Refresh models"
              >
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''}</span>
              {searchQuery && (
                <>
                  <span>•</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Clear search
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Models list */}
          <div className="overflow-y-auto scrollbar-thin flex-1">
            {filteredModels.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? (
                  <>
                    No models found matching &quot;{searchQuery}&quot;
                  </>
                ) : (
                  <>
                    No models available. Make sure Ollama is running or add API provider keys in Settings.
                  </>
                )}
              </div>
            ) : (
              <div className="p-1">
                {sortedProviders.map((provider) => (
                  <div key={provider} className="mb-3 last:mb-0">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {provider}
                    </div>
                    {groupedModels[provider].map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.name);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedModel === model.name
                            ? 'bg-primary-100 dark:bg-primary-900/30'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{model.name}</span>
                              <span className={`px-1.5 py-0.5 text-xs rounded ${getProviderColor(model.provider)}`}>
                                {model.provider}
                              </span>
                            </div>
                            {model.details && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {model.details.parameter_size || model.details.family}
                              </div>
                            )}
                          </div>
                          {model.size && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatModelSize(model.size)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
