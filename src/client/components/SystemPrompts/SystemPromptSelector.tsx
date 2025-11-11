import { useState, useRef, useEffect, useMemo } from 'react';
import { usePrompts } from '../../hooks/usePromptsQuery';

interface SystemPromptSelectorProps {
  selectedPromptId?: string;
  onPromptChange: (promptId: string | undefined) => void;
  disabled?: boolean;
}

export const SystemPromptSelector = ({
  selectedPromptId,
  onPromptChange,
  disabled,
}: SystemPromptSelectorProps) => {
  // Fetch all prompts and filter for system prompts on the client side
  // This avoids needing a separate backend endpoint
  const { data: allPrompts = [], isLoading } = usePrompts({});
  const systemPrompts = useMemo(
    () => allPrompts.filter((p) => p.isSystemPrompt),
    [allPrompts]
  );

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPrompt = systemPrompts.find((p) => p.id === selectedPromptId);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          selectedPromptId
            ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="text-sm font-medium">
          {selectedPrompt ? selectedPrompt.name : 'System Prompt'}
        </span>
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
        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto scrollbar-thin">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select System Prompt
            </span>
          </div>

          <div className="p-1">
            <button
              onClick={() => {
                onPromptChange(undefined);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                !selectedPromptId ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="text-sm font-medium">None</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No system prompt
              </div>
            </button>

            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  Loading prompts...
                </div>
              </div>
            ) : systemPrompts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p>No system prompts yet.</p>
                <p className="mt-1">Go to <span className="font-medium">Prompts</span> tab and mark prompts as system prompts!</p>
              </div>
            ) : (
              systemPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => {
                    onPromptChange(prompt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedPromptId === prompt.id
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : ''
                  }`}
                >
                  <div className="text-sm font-medium truncate">{prompt.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {prompt.currentVersion?.content || prompt.description || 'No content'}
                  </div>
                  {prompt.currentVersion && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      v{prompt.currentVersion.versionNumber}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
