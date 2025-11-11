import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { toastUtils } from '../utils/toast';
import type { Collection, OllamaModel } from '../../shared/types';

export function CollectionsPage() {
  const { collections, embeddingModels, addCollection, deleteCollection } = useChatStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections();
    fetchEmbeddingModels();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections');
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      useChatStore.getState().setCollections(data);
    } catch (error) {
      toastUtils.error('Failed to load collections');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmbeddingModels = async () => {
    try {
      const response = await fetch('/api/ollama/models/embeddings');
      if (!response.ok) throw new Error('Failed to fetch embedding models');
      const data = await response.json();
      useChatStore.getState().setEmbeddingModels(data.models || []);
    } catch (error) {
      console.error('Failed to fetch embedding models:', error);
    }
  };

  const handleDelete = async (collectionId: string) => {
    if (!confirm('Are you sure? This will delete all documents in this collection.')) {
      return;
    }

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete collection');

      deleteCollection(collectionId);
      if (selectedCollection?.id === collectionId) {
        setSelectedCollection(null);
      }
      toastUtils.success('Collection deleted');
    } catch (error) {
      toastUtils.error('Failed to delete collection');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-sm">Loading collections...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📚</span>
              <span>RAG Collections</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Upload documents and create knowledge bases for your AI
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>New Collection</span>
          </button>
        </div>

        {/* Search */}
        {collections.length > 0 && (
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No collections yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
              Create your first collection to start using RAG (Retrieval-Augmented Generation).
              Upload documents and let your AI reference them in conversations.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Create First Collection
            </button>
          </div>
        ) : (() => {
          // Filter collections by search query
          const filteredCollections = searchQuery
            ? collections.filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : collections;

          return filteredCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 p-8">
              <Search className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">No collections found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onSelect={() => setSelectedCollection(collection)}
                onDelete={() => handleDelete(collection.id)}
              />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      {isCreating && (
        <CreateCollectionModal
          embeddingModels={embeddingModels}
          onClose={() => setIsCreating(false)}
          onCreated={(collection) => {
            addCollection(collection);
            setIsCreating(false);
            toastUtils.success('Collection created!');
          }}
        />
      )}

      {selectedCollection && (
        <CollectionDetailsModal
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
        />
      )}
    </div>
  );
}

// Collection Card Component
function CollectionCard({
  collection,
  onSelect,
  onDelete,
}: {
  collection: Collection;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const completedDocs = collection.documents?.filter((d) => d.status === 'completed').length || 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group">
      <div onClick={onSelect}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{collection.name}</h3>
            {collection.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <span>📄</span>
            <span>{completedDocs} documents</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🧠</span>
            <span className="text-xs">{collection.embedding}</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-500">
          Created {new Date(collection.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onSelect}
          className="flex-1 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
        >
          Manage
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Create Collection Modal
function CreateCollectionModal({
  embeddingModels,
  onClose,
  onCreated,
}: {
  embeddingModels: OllamaModel[];
  onClose: () => void;
  onCreated: (collection: Collection) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [embedding, setEmbedding] = useState('nomic-embed-text');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toastUtils.error('Please enter a collection name');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          embedding,
        }),
      });

      if (!response.ok) throw new Error('Failed to create collection');

      const collection = await response.json();
      onCreated(collection);
    } catch (error) {
      toastUtils.error('Failed to create collection');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create New Collection
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Documents"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Embedding Model
            </label>
            <select
              value={embedding}
              onChange={(e) => setEmbedding(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="nomic-embed-text">nomic-embed-text (default)</option>
              {embeddingModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Choose the embedding model for semantic search. Can't be changed later.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Collection Details Modal with Document Upload
function CollectionDetailsModal({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const [documents, setDocuments] = useState(collection.documents || []);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  let fileInputRef: HTMLInputElement | null = null;

  // Fetch documents
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/documents?collectionId=${collection.id}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('collectionId', collection.id);

        // Update progress
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Update progress to complete
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

        // Show success toast
        toastUtils.success(`Uploaded ${file.name}`);

        // Refresh document list
        await fetchDocuments();
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toastUtils.error(`Failed to upload ${file.name}`);
      } finally {
        // Remove progress indicator after a delay
        setTimeout(() => {
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        }, 1000);
      }
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      toastUtils.success('Document deleted');
      await fetchDocuments();
    } catch (error) {
      toastUtils.error('Failed to delete document');
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⏳';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{collection.name}</h2>
              {collection.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{collection.description}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Embedding: {collection.embedding}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600'
            }`}
          >
            <input
              ref={(ref) => {
                if (ref) fileInputRef = ref;
              }}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.json,.csv,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.go,.rs"
            />
            <div className="space-y-3">
              <div className="text-4xl">📁</div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">
                  {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  or{' '}
                  <button
                    onClick={() => fileInputRef?.click()}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    browse
                  </button>
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Supported: PDF, DOCX, TXT, MD, JSON, CSV, Code files
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 dark:text-gray-300">{filename}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{progress}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Document List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Documents ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No documents yet</p>
                <p className="text-sm mt-1">Upload files to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">📄</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {doc.filename}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span className={getStatusColor(doc.status)}>
                            {getStatusIcon(doc.status)} {doc.status}
                          </span>
                          {doc.chunkCount > 0 && <span>{doc.chunkCount} chunks</span>}
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                        {doc.errorMessage && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {doc.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete document"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
