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
  const [isSystemPrompt, setIsSystemPrompt] = useState(prompt?.isSystemPrompt || false);
  const [changeDescription, setChangeDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: collections = [] } = usePromptCollections();
  const createMutation = useCreatePrompt();
  const updateMutation = useUpdatePrompt();

  // Character limits
  const NAME_LIMIT = 200;
  const DESCRIPTION_LIMIT = 500;
  const CONTENT_LIMIT = 50000;

  // Extract variables from content
  const extractedVariables = extractVariables(content);

  // Validation helpers
  const getFieldStatus = (length: number, limit: number) => {
    const percentage = (length / limit) * 100;
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'normal';
  };

  const nameStatus = getFieldStatus(name.length, NAME_LIMIT);
  const descriptionStatus = getFieldStatus(description.length, DESCRIPTION_LIMIT);
  const contentStatus = getFieldStatus(content.length, CONTENT_LIMIT);

  const handleSave = async () => {
    // Clear previous errors
    setValidationErrors([]);
    const errors: string[] = [];

    // Validate name
    if (!name.trim()) {
      errors.push('Prompt name is required');
    } else if (name.length > NAME_LIMIT) {
      errors.push(`Name must be ${NAME_LIMIT} characters or less (currently ${name.length})`);
    }

    // Validate content
    if (!content.trim()) {
      errors.push('Prompt content is required');
    } else if (content.length > CONTENT_LIMIT) {
      errors.push(`Content must be ${CONTENT_LIMIT} characters or less (currently ${content.length})`);
    }

    // Validate description
    if (description && description.length > DESCRIPTION_LIMIT) {
      errors.push(`Description must be ${DESCRIPTION_LIMIT} characters or less (currently ${description.length})`);
    }

    // Show errors if any
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
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
          isSystemPrompt: isSystemPrompt !== prompt.isSystemPrompt ? isSystemPrompt : undefined,
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
          isSystemPrompt,
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
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
                Please fix the following errors:
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-800 dark:text-red-400">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Name & Options */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prompt Name *
                </label>
                <span className={`text-xs ${
                  nameStatus === 'error'
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : nameStatus === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {name.length}/{NAME_LIMIT}
                </span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Review Assistant"
                maxLength={NAME_LIMIT}
                className={`w-full px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 dark:text-white ${
                  nameStatus === 'error'
                    ? 'border-red-500 focus:ring-red-500'
                    : nameStatus === 'warning'
                    ? 'border-yellow-500 focus:ring-yellow-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                }`}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => setIsSystemPrompt(!isSystemPrompt)}
                className={`p-3 rounded-lg transition-colors ${
                  isSystemPrompt
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
                title="Toggle system prompt (can be used in chats)"
              >
                <svg
                  className="w-5 h-5"
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
              </button>
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <span className={`text-xs ${
                descriptionStatus === 'error'
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : descriptionStatus === 'warning'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {description.length}/{DESCRIPTION_LIMIT}
              </span>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt does"
              maxLength={DESCRIPTION_LIMIT}
              className={`w-full px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 dark:text-white ${
                descriptionStatus === 'error'
                  ? 'border-red-500 focus:ring-red-500'
                  : descriptionStatus === 'warning'
                  ? 'border-yellow-500 focus:ring-yellow-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
              }`}
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prompt Content *
              </label>
              <span className={`text-xs ${
                contentStatus === 'error'
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : contentStatus === 'warning'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {content.length.toLocaleString()}/{CONTENT_LIMIT.toLocaleString()}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prompt here... Use {{variable_name}} for variables"
              rows={12}
              maxLength={CONTENT_LIMIT}
              className={`w-full px-4 py-3 bg-white dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 dark:text-white font-mono text-sm resize-none ${
                contentStatus === 'error'
                  ? 'border-red-500 focus:ring-red-500'
                  : contentStatus === 'warning'
                  ? 'border-yellow-500 focus:ring-yellow-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
              }`}
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
            {(createMutation.isPending || updateMutation.isPending) && (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                !name.trim() ||
                !content.trim() ||
                name.length > NAME_LIMIT ||
                description.length > DESCRIPTION_LIMIT ||
                content.length > CONTENT_LIMIT ||
                createMutation.isPending ||
                updateMutation.isPending
              }
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
