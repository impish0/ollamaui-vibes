import { useState } from 'react';
import { X, Edit2, Trash2, History, Star, Copy, Check, Tag, Folder } from 'lucide-react';
import { usePrompt, useDeletePrompt, useUpdatePrompt } from '../../hooks/usePromptsQuery';
import { PromptEditorModal } from './PromptEditorModal';

interface PromptDetailsModalProps {
  promptId: string;
  onClose: () => void;
}

export function PromptDetailsModal({ promptId, onClose }: PromptDetailsModalProps) {
  const { data: prompt, isLoading } = usePrompt(promptId);
  const deleteMutation = useDeletePrompt();
  const updateMutation = useUpdatePrompt();

  const [isEditing, setIsEditing] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="text-gray-500 dark:text-gray-400">Loading prompt...</div>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return null;
  }

  const tags = prompt.tags ? (typeof prompt.tags === 'string' ? JSON.parse(prompt.tags) : prompt.tags) : [];
  const variables = prompt.currentVersion?.variables
    ? (typeof prompt.currentVersion.variables === 'string' ? JSON.parse(prompt.currentVersion.variables) : prompt.currentVersion.variables)
    : [];

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync(promptId);
        onClose();
      } catch (error) {
        console.error('Failed to delete prompt:', error);
      }
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await updateMutation.mutateAsync({
        id: promptId,
        data: { isFavorite: !prompt.isFavorite },
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCopyContent = async () => {
    if (prompt.currentVersion?.content) {
      await navigator.clipboard.writeText(prompt.currentVersion.content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  if (isEditing) {
    return (
      <PromptEditorModal
        prompt={prompt}
        onClose={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{prompt.name}</h2>
                {prompt.isFavorite && (
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                )}
              </div>
              {prompt.description && (
                <p className="text-gray-600 dark:text-gray-400">{prompt.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <History className="w-4 h-4" />
                  <span>Version {prompt.currentVersion?.versionNumber || 1}</span>
                </div>
                {prompt.collection && (
                  <div className="flex items-center gap-1">
                    <Folder className="w-4 h-4" />
                    <span>{prompt.collection.name}</span>
                  </div>
                )}
                <span>Updated {new Date(prompt.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleCopyContent}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {copiedContent ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Content
                </>
              )}
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                prompt.isFavorite
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Star className={`w-4 h-4 ${prompt.isFavorite ? 'fill-current' : ''}`} />
              {prompt.isFavorite ? 'Unfavorite' : 'Favorite'}
            </button>
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <History className="w-4 h-4" />
              Version History ({prompt.versions?.length || 1})
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variables */}
          {variables.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📌 Variables ({variables.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {variables.map((variable: string) => (
                  <code
                    key={variable}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
                  >
                    {'{{'}{variable}{'}}'}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Content */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</h3>
            <pre className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {prompt.currentVersion?.content}
            </pre>
          </div>

          {/* Version History */}
          {showVersionHistory && prompt.versions && prompt.versions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Version History
              </h3>
              <div className="space-y-2">
                {prompt.versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg ${
                      version.id === prompt.currentVersionId
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Version {version.versionNumber}
                        </span>
                        {version.id === prompt.currentVersionId && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 text-white rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {version.changeDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {version.changeDescription}
                      </p>
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        View content
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono whitespace-pre-wrap">
                        {version.content}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
