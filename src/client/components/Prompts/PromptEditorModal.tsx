import { useState } from 'react';
import { X, Save, Star, Tag, Folder, Lightbulb, History } from 'lucide-react';
import {
  useCreatePrompt,
  useUpdatePrompt,
  usePromptCollections,
} from '../../hooks/usePromptsQuery';
import type { PromptTemplate, CreatePromptTemplateRequest, UpdatePromptTemplateRequest } from '@shared/types';

interface PromptEditorModalProps {
  prompt?: PromptTemplate; // If provided, we're editing; otherwise creating
  onClose: () => void;
  onSuccess?: () => void;
}

export function PromptEditorModal({ prompt, onClose, onSuccess }: PromptEditorModalProps) {
  const isEditing = !!prompt;

  const [name, setName] = useState(prompt?.name || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [content, setContent] = useState(prompt?.currentVersion?.content || '');
  const [collectionId, setCollectionId] = useState(prompt?.collectionId || '');
  const [tags, setTags] = useState<string[]>(
    prompt?.tags ? (typeof prompt.tags === 'string' ? JSON.parse(prompt.tags) : prompt.tags) : []
  );
  const [isFavorite, setIsFavorite] = useState(prompt?.isFavorite || false);
  const [changeDescription, setChangeDescription] = useState('');
  const [tagInput, setTagInput] = useState('');

  const { data: collections = [] } = usePromptCollections();
  const createMutation = useCreatePrompt();
  const updateMutation = useUpdatePrompt();

  // Extract variables from content
  const extractedVariables = extractVariables(content);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      return; // Basic validation
    }

    try {
      if (isEditing && prompt) {
        // Update existing prompt
        const updateData: UpdatePromptTemplateRequest = {
          name: name !== prompt.name ? name : undefined,
          description: description !== prompt.description ? description : undefined,
          collectionId: collectionId !== prompt.collectionId ? (collectionId || undefined) : undefined,
          content: content !== prompt.currentVersion?.content ? content : undefined,
          changeDescription: content !== prompt.currentVersion?.content ? changeDescription : undefined,
          tags: JSON.stringify(tags) !== prompt.tags ? tags : undefined,
          isFavorite: isFavorite !== prompt.isFavorite ? isFavorite : undefined,
        };

        await updateMutation.mutateAsync({ id: prompt.id, data: updateData });
      } else {
        // Create new prompt
        const createData: CreatePromptTemplateRequest = {
          name,
          description: description || undefined,
          collectionId: collectionId || undefined,
          content,
          tags: tags.length > 0 ? tags : undefined,
          isFavorite,
        };

        await createMutation.mutateAsync(createData);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Prompt' : 'Create New Prompt'}
              </h2>
              {isEditing && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Saving will create version {(prompt?.currentVersion?.versionNumber || 0) + 1}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name & Favorite */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Review Assistant"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-3 rounded-lg transition-colors ${
                  isFavorite
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
                title="Toggle favorite"
              >
                <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt does"
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          {/* Collection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Folder className="w-4 h-4" />
              Collection
            </label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            >
              <option value="">None (Uncategorized)</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag (press Enter)"
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-sm"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Prompt Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompt Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prompt here... Use {{variable_name}} for variables"
              rows={12}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white font-mono text-sm resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{'{{variable}}'}</code> syntax to create variables
            </p>
          </div>

          {/* Detected Variables */}
          {extractedVariables.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                📌 Detected Variables ({extractedVariables.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {extractedVariables.map((variable) => (
                  <code
                    key={variable}
                    className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
                  >
                    {'{{'}{variable}{'}}'}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Change Description (for edits) */}
          {isEditing && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <History className="w-4 h-4" />
                Change Description (Optional)
              </label>
              <input
                type="text"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="Describe what you changed..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {content.length > 0 && (
              <span>{content.length} characters</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !content.trim() || createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Save Version' : 'Create Prompt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to extract variables
function extractVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(content)) !== null) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}
