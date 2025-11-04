import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemPromptsApi } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toastUtils } from '../utils/toast';
import type { SystemPrompt, CreateSystemPromptRequest, UpdateSystemPromptRequest } from '../../shared/types';

/**
 * React Query hooks for system prompts
 * Provides intelligent caching, automatic refetching, and optimistic updates
 */

/**
 * Fetch all system prompts with caching
 */
export const useSystemPrompts = () => {
  return useQuery({
    queryKey: queryKeys.systemPrompts.all,
    queryFn: () => systemPromptsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes (prompts rarely change)
  });
};

/**
 * Fetch a single system prompt by ID
 */
export const useSystemPrompt = (promptId: string | null) => {
  return useQuery({
    queryKey: promptId ? queryKeys.systemPrompts.detail(promptId) : ['system-prompts', 'none'],
    queryFn: () => {
      if (!promptId) throw new Error('No prompt ID provided');
      return systemPromptsApi.getById(promptId);
    },
    enabled: !!promptId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Create a new system prompt with optimistic update
 */
export const useCreateSystemPrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSystemPromptRequest) => systemPromptsApi.create(data),

    onMutate: async (newPrompt) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.systemPrompts.all });

      // Snapshot previous value
      const previousPrompts = queryClient.getQueryData<SystemPrompt[]>(queryKeys.systemPrompts.all);

      // Optimistically add new prompt to the list
      if (previousPrompts) {
        const optimisticPrompt: SystemPrompt = {
          id: `temp-${Date.now()}`,
          name: newPrompt.name,
          content: newPrompt.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<SystemPrompt[]>(
          queryKeys.systemPrompts.all,
          [optimisticPrompt, ...previousPrompts]
        );
      }

      return { previousPrompts };
    },

    onError: (_err, _newPrompt, context) => {
      // Rollback on error
      if (context?.previousPrompts) {
        queryClient.setQueryData(queryKeys.systemPrompts.all, context.previousPrompts);
      }
      toastUtils.error('Failed to create system prompt');
    },

    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.systemPrompts.all });
      toastUtils.success('System prompt created successfully');
    },
  });
};

/**
 * Update an existing system prompt with optimistic update
 */
export const useUpdateSystemPrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promptId, updates }: { promptId: string; updates: UpdateSystemPromptRequest }) =>
      systemPromptsApi.update(promptId, updates),

    onMutate: async ({ promptId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.systemPrompts.detail(promptId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.systemPrompts.all });

      // Snapshot previous values
      const previousPrompt = queryClient.getQueryData<SystemPrompt>(queryKeys.systemPrompts.detail(promptId));
      const previousPrompts = queryClient.getQueryData<SystemPrompt[]>(queryKeys.systemPrompts.all);

      // Optimistically update the prompt
      if (previousPrompt) {
        const optimisticPrompt = { ...previousPrompt, ...updates, updatedAt: new Date().toISOString() };
        queryClient.setQueryData(queryKeys.systemPrompts.detail(promptId), optimisticPrompt);
      }

      // Update in the list too
      if (previousPrompts) {
        const optimisticPrompts = previousPrompts.map((prompt) =>
          prompt.id === promptId ? { ...prompt, ...updates, updatedAt: new Date().toISOString() } : prompt
        );
        queryClient.setQueryData(queryKeys.systemPrompts.all, optimisticPrompts);
      }

      return { previousPrompt, previousPrompts };
    },

    onError: (_err, { promptId }, context) => {
      // Rollback on error
      if (context?.previousPrompt) {
        queryClient.setQueryData(queryKeys.systemPrompts.detail(promptId), context.previousPrompt);
      }
      if (context?.previousPrompts) {
        queryClient.setQueryData(queryKeys.systemPrompts.all, context.previousPrompts);
      }
      toastUtils.error('Failed to update system prompt');
    },

    onSuccess: (_data, { promptId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.systemPrompts.detail(promptId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.systemPrompts.all });
      toastUtils.success('System prompt updated successfully');
    },
  });
};

/**
 * Delete a system prompt with optimistic update
 */
export const useDeleteSystemPrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promptId: string) => systemPromptsApi.delete(promptId),

    onMutate: async (promptId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.systemPrompts.all });

      // Snapshot previous value
      const previousPrompts = queryClient.getQueryData<SystemPrompt[]>(queryKeys.systemPrompts.all);

      // Optimistically remove from list
      if (previousPrompts) {
        const optimisticPrompts = previousPrompts.filter((prompt) => prompt.id !== promptId);
        queryClient.setQueryData(queryKeys.systemPrompts.all, optimisticPrompts);
      }

      return { previousPrompts };
    },

    onError: (_err, _promptId, context) => {
      // Rollback on error
      if (context?.previousPrompts) {
        queryClient.setQueryData(queryKeys.systemPrompts.all, context.previousPrompts);
      }
      toastUtils.error('Failed to delete system prompt');
    },

    onSuccess: (_data, promptId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.systemPrompts.detail(promptId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.systemPrompts.all });

      // Also invalidate chats that might be using this prompt
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });

      toastUtils.success('System prompt deleted successfully');
    },
  });
};
