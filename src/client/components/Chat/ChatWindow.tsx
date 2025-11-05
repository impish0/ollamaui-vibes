import { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../../hooks/useMessaging';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModelSelector } from '../ModelSelector/ModelSelector';
import { SystemPromptSelector } from '../SystemPrompts/SystemPromptSelector';
import { useChatStore } from '../../store/chatStore';
import { toastUtils } from '../../utils/toast';
import type { Chat } from '../../../shared/types';

interface ChatWindowProps {
  chat: Chat;
}

export const ChatWindow = ({ chat }: ChatWindowProps) => {
  const { sendMessage, updateChat, isStreaming, streamingContent, stopStreaming } = useMessaging();
  const {
    collections,
    selectedCollectionIds,
    ragEnabled,
    setRagEnabled,
    toggleCollectionSelection,
  } = useChatStore();
  const [selectedModel, setSelectedModel] = useState(chat.model);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState(
    chat.systemPromptId || undefined
  );
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const collectionSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedModel(chat.model);
    setSelectedSystemPromptId(chat.systemPromptId || undefined);
  }, [chat.id, chat.model, chat.systemPromptId]);

  // Fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/collections');
        if (response.ok) {
          const data = await response.json();
          useChatStore.getState().setCollections(data);
        }
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      }
    };
    fetchCollections();
  }, []);

  // Close collection selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collectionSelectorRef.current &&
        !collectionSelectorRef.current.contains(event.target as Node)
      ) {
        setShowCollectionSelector(false);
      }
    };

    if (showCollectionSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCollectionSelector]);

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    try {
      await updateChat(chat.id, { model });
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  const handleSystemPromptChange = async (promptId: string | undefined) => {
    setSelectedSystemPromptId(promptId);
    try {
      await updateChat(chat.id, { systemPromptId: promptId ?? undefined });
    } catch (error) {
      console.error('Failed to update system prompt:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      // Pass collection IDs if RAG is enabled and collections are selected
      const collectionIds = ragEnabled && selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined;
      await sendMessage(chat.id, message, selectedModel, collectionIds);
    } catch (error) {
      console.error('Failed to send message:', error);
      toastUtils.error('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {chat.title || 'New Conversation'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <SystemPromptSelector
              selectedPromptId={selectedSystemPromptId}
              onPromptChange={handleSystemPromptChange}
              disabled={isStreaming}
            />
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              disabled={isStreaming}
            />

            {/* RAG Toggle */}
            <div className="relative" ref={collectionSelectorRef}>
              <button
                onClick={() => {
                  if (!ragEnabled) {
                    // Enabling RAG
                    setRagEnabled(true);
                    if (collections.length === 0) {
                      toastUtils.info('No collections available. Create one in the Collections page.');
                    } else {
                      setShowCollectionSelector(true);
                    }
                  } else {
                    // If clicking when RAG is enabled, toggle dropdown
                    setShowCollectionSelector(!showCollectionSelector);
                  }
                }}
                onContextMenu={(e) => {
                  // Right-click to disable RAG
                  e.preventDefault();
                  setRagEnabled(false);
                  setShowCollectionSelector(false);
                }}
                disabled={isStreaming}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  ragEnabled
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                } ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={ragEnabled ? 'RAG enabled - Click to select collections, Right-click to disable' : 'RAG disabled - Click to enable'}
              >
                <span>📚</span>
                <span>RAG</span>
                {ragEnabled && selectedCollectionIds.length > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                    {selectedCollectionIds.length}
                  </span>
                )}
              </button>

              {/* Collection Selector Dropdown */}
              {showCollectionSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="p-3">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Select Collections
                    </div>
                    {collections.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                        No collections available
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {collections.map((collection) => (
                          <label
                            key={collection.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCollectionIds.includes(collection.id)}
                              onChange={() => toggleCollectionSelection(collection.id)}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {collection.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {collection.documents?.filter((d) => d.status === 'completed').length || 0} docs
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isStreaming && (
              <button
                onClick={stopStreaming}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={chat.messages || []}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={isStreaming}
        placeholder={
          isStreaming
            ? 'Waiting for response...'
            : 'Type your message... (Shift+Enter for new line)'
        }
      />
    </div>
  );
};
