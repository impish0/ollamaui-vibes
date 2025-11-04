import { useState, useEffect } from 'react';
import { useSystemPrompts, useCreateSystemPrompt, useUpdateSystemPrompt, useDeleteSystemPrompt } from '../../hooks/useSystemPromptsQuery';
import { SystemPromptSkeleton } from '../UI/Skeleton';
import { toastUtils } from '../../utils/toast';

interface SystemPromptModalProps {
  onClose: () => void;
}

export const SystemPromptModal = ({ onClose }: SystemPromptModalProps) => {
  const { data: systemPrompts = [], isLoading } = useSystemPrompts();
  const createMutation = useCreateSystemPrompt();
  const updateMutation = useUpdateSystemPrompt();
  const deleteMutation = useDeleteSystemPrompt();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId || isCreating) {
          // If editing/creating, cancel that first
          cancelEditing();
        } else {
          // Otherwise close modal
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingId, isCreating, onClose]);

  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) {
      toastUtils.warning('Name and content are required');
      return;
    }

    try {
      await createMutation.mutateAsync({ name: name.trim(), content: content.trim() });
      setName('');
      setContent('');
      setIsCreating(false);
      // Success toast already shown by mutation
    } catch (error) {
      console.error('Failed to create system prompt:', error);
      // Error toast already shown by mutation
    }
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim() || !content.trim()) {
      toastUtils.warning('Name and content are required');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        promptId: id,
        updates: { name: name.trim(), content: content.trim() }
      });
      setEditingId(null);
      setName('');
      setContent('');
      // Success toast already shown by mutation
    } catch (error) {
      console.error('Failed to update system prompt:', error);
      // Error toast already shown by mutation
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await toastUtils.confirm(
      'Are you sure you want to delete this system prompt?',
      'Delete',
      'Cancel'
    );

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        // Success toast already shown by mutation
      } catch (error) {
        console.error('Failed to delete system prompt:', error);
        // Error toast already shown by mutation
      }
    }
  };

  const startEditing = (id: string) => {
    const prompt = systemPrompts.find((p) => p.id === id);
    if (prompt) {
      setEditingId(id);
      setName(prompt.name);
      setContent(prompt.content);
      setIsCreating(false);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    setName('');
    setContent('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold">System Prompts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prompt name"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="System prompt content"
                rows={4}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    editingId ? handleUpdate(editingId) : handleCreate()
                  }
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Create Button */}
          {!isCreating && !editingId && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New System Prompt
            </button>
          )}

          {/* Prompts List */}
          <div className="space-y-3">
            {isLoading ? (
              <SystemPromptSkeleton />
            ) : systemPrompts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="text-5xl opacity-50">📝</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  No system prompts yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Create custom system prompts to guide your AI conversations
                </p>
              </div>
            ) : (
              systemPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-2">{prompt.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {prompt.content}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Created: {new Date(prompt.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(prompt.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <svg
                          className="w-5 h-5 text-gray-600 dark:text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete"
                      >
                        <svg
                          className="w-5 h-5 text-red-600 dark:text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
