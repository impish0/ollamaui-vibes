import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Folder, FolderPlus } from 'lucide-react';
import {
  usePromptCollections,
  useCreatePromptCollection,
  useUpdatePromptCollection,
  useDeletePromptCollection,
} from '../../hooks/usePromptsQuery';
import type { PromptCollection } from '@shared/types';

interface CollectionManagerModalProps {
  onClose: () => void;
}

export function CollectionManagerModal({ onClose }: CollectionManagerModalProps) {
  const { data: collections = [] } = usePromptCollections();
  const createMutation = useCreatePromptCollection();
  const updateMutation = useUpdatePromptCollection();
  const deleteMutation = useDeletePromptCollection();

  const [isCreating, setIsCreating] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PromptCollection | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Folder className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Collections</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organize your prompts into collections
              </p>
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
        <div className="p-6 space-y-4">
          {/* Create New Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>

          {/* Create/Edit Form */}
          {(isCreating || editingCollection) && (
            <CollectionForm
              collection={editingCollection}
              onSave={async (data) => {
                try {
                  if (editingCollection) {
                    await updateMutation.mutateAsync({ id: editingCollection.id, data });
                    setEditingCollection(null);
                  } else {
                    await createMutation.mutateAsync(data);
                    setIsCreating(false);
                  }
                } catch (error) {
                  console.error('Failed to save collection:', error);
                }
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingCollection(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          )}

          {/* Collections List */}
          {collections.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No collections yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Create your first collection to organize prompts
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                >
                  {collection.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: collection.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCollection(collection)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit collection"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete "${collection.name}" collection? Prompts will remain but be uncategorized.`)) {
                          try {
                            await deleteMutation.mutateAsync(collection.id);
                          } catch (error) {
                            console.error('Failed to delete collection:', error);
                          }
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface CollectionFormProps {
  collection?: PromptCollection | null;
  onSave: (data: { name: string; description?: string; color?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function CollectionForm({ collection, onSave, onCancel, isLoading }: CollectionFormProps) {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [color, setColor] = useState(collection?.color || '#3B82F6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name,
      description: description || undefined,
      color: color || undefined,
    });
  };

  const colorPresets = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Collection Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Code Review"
          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className={`w-8 h-8 rounded-full transition-all ${
                color === preset
                  ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: preset }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {collection ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
