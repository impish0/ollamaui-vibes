import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toastUtils } from '../utils/toast';
import type { Chat, CreateChatRequest, UpdateChatRequest } from '../../shared/types';

/**
 * React Query hooks for chat operations
 * Provides intelligent caching, automatic refetching, and optimistic updates
 */

/**
 * Fetch all chats with caching
 */
export const useChats = () => {
  return useQuery({
    queryKey: queryKeys.chats.all,
    queryFn: () => chatsApi.getAll(),
    staleTime: 1 * 60 * 1000, // 1 minute (chats change frequently)
  });
};

/**
 * Fetch a single chat by ID with all messages
 */
export const useChat = (chatId: string | null) => {
  return useQuery({
    queryKey: chatId ? queryKeys.chats.detail(chatId) : ['chats', 'none'],
    queryFn: () => {
      if (!chatId) throw new Error('No chat ID provided');
      return chatsApi.getById(chatId);
    },
    enabled: !!chatId, // Only fetch if chatId exists
    staleTime: 30 * 1000, // 30 seconds (messages update frequently)
  });
};

/**
 * Create a new chat with optimistic update
 */
export const useCreateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChatRequest) => chatsApi.create(data),

    onMutate: async (newChat) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.all });

      // Snapshot previous value
      const previousChats = queryClient.getQueryData<Chat[]>(queryKeys.chats.all);

      // Optimistically add new chat to the list
      if (previousChats) {
        const optimisticChat: Chat = {
          id: `temp-${Date.now()}`,
          title: null,
          model: newChat.model,
          systemPromptId: newChat.systemPromptId || null,
          systemPrompt: null,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Chat[]>(
          queryKeys.chats.all,
          [optimisticChat, ...previousChats]
        );
      }

      return { previousChats };
    },

    onError: (_err, _newChat, context) => {
      // Rollback on error
      if (context?.previousChats) {
        queryClient.setQueryData(queryKeys.chats.all, context.previousChats);
      }
      toastUtils.error('Failed to create chat');
    },

    onSuccess: (newChat) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });
      toastUtils.success('Chat created successfully');
      return newChat;
    },
  });
};

/**
 * Update an existing chat with optimistic update
 */
export const useUpdateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, updates }: { chatId: string; updates: UpdateChatRequest }) =>
      chatsApi.update(chatId, updates),

    onMutate: async ({ chatId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.all });

      // Snapshot previous values
      const previousChat = queryClient.getQueryData<Chat>(queryKeys.chats.detail(chatId));
      const previousChats = queryClient.getQueryData<Chat[]>(queryKeys.chats.all);

      // Optimistically update the chat
      if (previousChat) {
        const optimisticChat = { ...previousChat, ...updates };
        queryClient.setQueryData(queryKeys.chats.detail(chatId), optimisticChat);
      }

      // Update in the list too
      if (previousChats) {
        const optimisticChats = previousChats.map((chat) =>
          chat.id === chatId ? { ...chat, ...updates } : chat
        );
        queryClient.setQueryData(queryKeys.chats.all, optimisticChats);
      }

      return { previousChat, previousChats };
    },

    onError: (_err, { chatId }, context) => {
      // Rollback on error
      if (context?.previousChat) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previousChat);
      }
      if (context?.previousChats) {
        queryClient.setQueryData(queryKeys.chats.all, context.previousChats);
      }
      toastUtils.error('Failed to update chat');
    },

    onSuccess: (_data, { chatId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });
    },
  });
};

/**
 * Delete a chat with optimistic update
 */
export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatsApi.delete(chatId),

    onMutate: async (chatId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.all });

      // Snapshot previous value
      const previousChats = queryClient.getQueryData<Chat[]>(queryKeys.chats.all);

      // Optimistically remove from list
      if (previousChats) {
        const optimisticChats = previousChats.filter((chat) => chat.id !== chatId);
        queryClient.setQueryData(queryKeys.chats.all, optimisticChats);
      }

      return { previousChats };
    },

    onError: (_err, _chatId, context) => {
      // Rollback on error
      if (context?.previousChats) {
        queryClient.setQueryData(queryKeys.chats.all, context.previousChats);
      }
      toastUtils.error('Failed to delete chat');
    },

    onSuccess: (_data, chatId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.chats.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });
      toastUtils.success('Chat deleted successfully');
    },
  });
};
