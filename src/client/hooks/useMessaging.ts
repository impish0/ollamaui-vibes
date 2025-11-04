import { useState } from 'react';
import { ollamaApi, chatsApi } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/react-query';
import type { Chat, Message } from '../../shared/types';

/**
 * Hook for messaging operations (streaming, sending messages)
 * Separate from data fetching which is handled by React Query
 */
export const useMessaging = () => {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  let abortController: AbortController | null = null;

  const sendMessage = async (chatId: string, message: string, model: string) => {
    try {
      setIsStreaming(true);
      setStreamingContent('');
      abortController = new AbortController();

      // OPTIMISTIC UPDATE: Immediately add user message to the chat
      queryClient.setQueryData<Chat>(queryKeys.chats.detail(chatId), (oldChat) => {
        if (!oldChat) return oldChat;

        const optimisticUserMessage: Message = {
          id: `temp-${Date.now()}`, // Temporary ID
          chatId,
          role: 'user',
          content: message,
          model: null,
          createdAt: new Date().toISOString(),
        };

        return {
          ...oldChat,
          messages: [...(oldChat.messages || []), optimisticUserMessage],
        };
      });

      // Stream response from Ollama
      for await (const chunk of ollamaApi.streamChat(chatId, model, message, { signal: abortController.signal })) {
        if (chunk.userMessageSaved && chunk.userMessageId) {
          // Replace the temporary user message with the real one from server
          queryClient.setQueryData<Chat>(queryKeys.chats.detail(chatId), (oldChat) => {
            if (!oldChat) return oldChat;

            return {
              ...oldChat,
              messages: (oldChat.messages || []).map(msg =>
                msg.id.startsWith('temp-') ? { ...msg, id: chunk.userMessageId! } : msg
              ),
            };
          });
        }

        if (chunk.content) {
          setStreamingContent((prev) => prev + chunk.content);
        }

        if (chunk.done && chunk.messageId) {
          // Streaming complete, refetch chat to get the final assistant message
          queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
          setStreamingContent('');
          setIsStreaming(false);
          abortController = null;
        }

        if (chunk.error) {
          console.error('Stream error:', chunk.error);
          setIsStreaming(false);
          setStreamingContent('');
          // Remove the optimistic user message on error
          queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
          throw new Error(chunk.error);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      setStreamingContent('');
      // Refetch to get correct state
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
      throw error;
    }
  };

  const updateChat = async (chatId: string, updates: { title?: string; model?: string; systemPromptId?: string }) => {
    try {
      await chatsApi.update(chatId, updates);
      // Invalidate both the specific chat and the chats list
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });
    } catch (error) {
      console.error('Failed to update chat:', error);
      throw error;
    }
  };

  const stopStreaming = () => {
    try {
      abortController?.abort();
      setIsStreaming(false);
      setStreamingContent('');
    } catch (error) {
      console.error('Failed to stop streaming:', error);
    }
  };

  return {
    isStreaming,
    streamingContent,
    sendMessage,
    updateChat,
    stopStreaming,
  };
};
