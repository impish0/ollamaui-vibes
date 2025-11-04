import { useState } from 'react';
import { ollamaApi, chatsApi } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/react-query';

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

      // Stream response from Ollama
      for await (const chunk of ollamaApi.streamChat(chatId, model, message, { signal: abortController.signal })) {
        if (chunk.content) {
          setStreamingContent((prev) => prev + chunk.content);
        }
        if (chunk.done && chunk.messageId) {
          // Streaming complete, invalidate chat query to refetch with new messages
          queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
          setStreamingContent('');
          setIsStreaming(false);
          abortController = null;
        }
        if (chunk.error) {
          console.error('Stream error:', chunk.error);
          setIsStreaming(false);
          setStreamingContent('');
          throw new Error(chunk.error);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      setStreamingContent('');
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
