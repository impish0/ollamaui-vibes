import { useState } from 'react';
import {
  Plus,
  Search,
  Folder,
  Star,
  Clock,
  FileText,
  Download,
  Upload,
  History,
} from 'lucide-react';
import {
  usePrompts,
  usePromptCollections,
} from '../hooks/usePromptsQuery';
import type { PromptTemplate } from '@shared/types';
import { PromptEditorModal } from '../components/Prompts/PromptEditorModal';
import { PromptDetailsModal } from '../components/Prompts/PromptDetailsModal';
import { CollectionManagerModal } from '../components/Prompts/CollectionManagerModal';
import { PromptImportModal } from '../components/Prompts/PromptImportModal';

export function PromptsView() {
  const [selectedCollection, setSelectedCollection] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSystemPromptsOnly, setShowSystemPromptsOnly] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: collections = [] } = usePromptCollections();
  const { data: allPrompts = [], isLoading: promptsLoading } = usePrompts({
    collectionId: selectedCollection,
    favorite: showFavorites,
    search: searchQuery || undefined,
  });

  // Filter for system prompts if the filter is active
  const prompts = showSystemPromptsOnly
    ? allPrompts.filter((p) => p.isSystemPrompt)
    : allPrompts;

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      prompts: prompts.map((p) => ({
        name: p.name,
        description: p.description,
        content: p.currentVersion?.content || '',
        collectionId: p.collectionId,
        tags: p.tags,
        isFavorite: p.isFavorite,
      })),
      collections: collections,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ollama-prompts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prompt Library</h1>
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                {prompts.length} prompts
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCollectionManager(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Folder className="w-4 h-4" />
                Collections
              </button>

              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>

              <button
                onClick={handleExport}
                disabled={prompts.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                New Prompt
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>

            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                showFavorites
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }`}
            >
              <Star className={`w-4 h-4 ${showFavorites ? 'fill-current' : ''}`} />
              Favorites
            </button>

            <button
              onClick={() => setShowSystemPromptsOnly(!showSystemPromptsOnly)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                showSystemPromptsOnly
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }`}
              title="Show only prompts marked as system prompts"
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
              System
            </button>

            <select
              value={selectedCollection || ''}
              onChange={(e) => setSelectedCollection(e.target.value || undefined)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            >
              <option value="">All Collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {promptsLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">Loading prompts...</div>
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || showFavorites ? 'No prompts found' : 'No prompts yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              {searchQuery || showFavorites
                ? 'Try adjusting your search or filters'
                : 'Create your first prompt to get started with version-controlled prompt management'}
            </p>
            {!searchQuery && !showFavorites && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Create Your First Prompt
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onSelect={() => setSelectedPromptId(prompt.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreating && (
        <PromptEditorModal
          onClose={() => setIsCreating(false)}
          onSuccess={() => setIsCreating(false)}
        />
      )}

      {selectedPromptId && (
        <PromptDetailsModal
          promptId={selectedPromptId}
          onClose={() => setSelectedPromptId(null)}
        />
      )}

      {showCollectionManager && (
        <CollectionManagerModal
          onClose={() => setShowCollectionManager(false)}
        />
      )}

      {showImport && (
        <PromptImportModal
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

interface PromptCardProps {
  prompt: PromptTemplate;
  onSelect: () => void;
}

function PromptCard({ prompt, onSelect }: PromptCardProps) {
  const tags = prompt.tags ? (typeof prompt.tags === 'string' ? JSON.parse(prompt.tags) : prompt.tags) : [];
  const content = prompt.currentVersion?.content || '';
  const preview = content.length > 150 ? content.substring(0, 150) + '...' : content;

  return (
    <button
      onClick={onSelect}
      className="text-left p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {prompt.name}
            </h3>
            {prompt.isFavorite && (
              <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
            )}
          </div>
          {prompt.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{prompt.description}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{preview}</p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <History className="w-3 h-3" />
          <span>v{prompt.currentVersion?.versionNumber || 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </button>
  );
}
