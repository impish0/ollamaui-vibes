import { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModelSelector } from '../ModelSelector/ModelSelector';
import { SystemPromptSelector } from '../SystemPrompts/SystemPromptSelector';
import { toastUtils } from '../../utils/toast';
import type { Chat } from '../../../shared/types';

interface ChatWindowProps {
  chat: Chat;
}

export const ChatWindow = ({ chat }: ChatWindowProps) => {
  const { sendMessage, updateChat, isStreaming, streamingContent, stopStreaming } = useChat();
  const [selectedModel, setSelectedModel] = useState(chat.model);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState(
    chat.systemPromptId || undefined
  );

  useEffect(() => {
    setSelectedModel(chat.model);
    setSelectedSystemPromptId(chat.systemPromptId || undefined);
  }, [chat.id, chat.model, chat.systemPromptId]);

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
      await sendMessage(chat.id, message, selectedModel);
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
