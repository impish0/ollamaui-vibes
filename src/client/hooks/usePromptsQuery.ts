import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PromptCollection,
  PromptTemplate,
  PromptVersion,
  CreatePromptCollectionRequest,
  UpdatePromptCollectionRequest,
  CreatePromptTemplateRequest,
  UpdatePromptTemplateRequest,
  CreatePromptVersionRequest,
  PromptDiff,
  InterpolatePromptRequest,
  ImportPromptsRequest,
  ExportPromptsResponse,
} from '@shared/types';
import { toastUtils } from '../utils/toast';

// ==================== Collections ====================

/**
 * Fetch all prompt collections
 */
export function usePromptCollections() {
  return useQuery({
    queryKey: ['promptCollections'],
    queryFn: async () => {
      const response = await fetch('/api/prompt-collections');
      if (!response.ok) throw new Error('Failed to fetch collections');
      return response.json() as Promise<PromptCollection[]>;
    },
  });
}

/**
 * Fetch a single prompt collection with its prompts
 */
export function usePromptCollection(id: string | undefined) {
  return useQuery({
    queryKey: ['promptCollection', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/prompt-collections/${id}`);
      if (!response.ok) throw new Error('Failed to fetch collection');
      return response.json() as Promise<PromptCollection>;
    },
    enabled: !!id,
  });
}

/**
 * Create a new prompt collection
 */
export function useCreatePromptCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePromptCollectionRequest) => {
      const response = await fetch('/api/prompt-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }
      return response.json() as Promise<PromptCollection>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptCollections'] });
      toastUtils.success('Collection created successfully');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to create collection: ${error.message}`);
    },
  });
}

/**
 * Update a prompt collection
 */
export function useUpdatePromptCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePromptCollectionRequest }) => {
      const response = await fetch(`/api/prompt-collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update collection');
      }
      return response.json() as Promise<PromptCollection>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['promptCollections'] });
      queryClient.invalidateQueries({ queryKey: ['promptCollection', variables.id] });
      toastUtils.success('Collection updated successfully');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to update collection: ${error.message}`);
    },
  });
}

/**
 * Delete a prompt collection
 */
export function useDeletePromptCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prompt-collections/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete collection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptCollections'] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toastUtils.success('Collection deleted successfully');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to delete collection: ${error.message}`);
    },
  });
}

// ==================== Prompts ====================

/**
 * Fetch all prompt templates with optional filtering
 */
export function usePrompts(params?: { collectionId?: string; favorite?: boolean; search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.collectionId) queryParams.set('collectionId', params.collectionId);
  if (params?.favorite) queryParams.set('favorite', 'true');
  if (params?.search) queryParams.set('search', params.search);

  return useQuery({
    queryKey: ['prompts', params],
    queryFn: async () => {
      const response = await fetch(`/api/prompts?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch prompts');
      return response.json() as Promise<PromptTemplate[]>;
    },
  });
}

/**
 * Fetch a single prompt template with all versions
 */
export function usePrompt(id: string | undefined) {
  return useQuery({
    queryKey: ['prompt', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/prompts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch prompt');
      return response.json() as Promise<PromptTemplate>;
    },
    enabled: !!id,
  });
}

/**
 * Create a new prompt template
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePromptTemplateRequest) => {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create prompt');
      }
      return response.json() as Promise<PromptTemplate>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toastUtils.success('Prompt created successfully');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to create prompt: ${error.message}`);
    },
  });
}

/**
 * Update a prompt template
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePromptTemplateRequest }) => {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update prompt');
      }
      return response.json() as Promise<PromptTemplate>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompt', variables.id] });
      toastUtils.success('Prompt updated successfully');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to update prompt: ${error.message}`);
    },
  });
}

/**
 * Delete a prompt template
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete prompt');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toastUtils.success('Prompt deleted successfully');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to delete prompt: ${error.message}`);
    },
  });
}

// ==================== Versions ====================

/**
 * Create a new version of a prompt
 */
export function useCreatePromptVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptId, data }: { promptId: string; data: CreatePromptVersionRequest }) => {
      const response = await fetch(`/api/prompts/${promptId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create version');
      }
      return response.json() as Promise<PromptVersion>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompt', variables.promptId] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toastUtils.success('New version created');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to create version: ${error.message}`);
    },
  });
}

/**
 * Get diff between two versions
 */
export function usePromptDiff(promptId: string | undefined, versionNumber: number | undefined, compareWith?: number) {
  return useQuery({
    queryKey: ['promptDiff', promptId, versionNumber, compareWith],
    queryFn: async () => {
      if (!promptId || versionNumber === undefined) return null;
      const params = new URLSearchParams();
      if (compareWith !== undefined) params.set('compareWith', compareWith.toString());

      const response = await fetch(`/api/prompts/${promptId}/versions/${versionNumber}/diff?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch diff');
      return response.json() as Promise<{ oldVersion: any; newVersion: any; diff: PromptDiff }>;
    },
    enabled: !!promptId && versionNumber !== undefined,
  });
}

/**
 * Revert to a specific version
 */
export function useRevertPromptVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptId, versionNumber }: { promptId: string; versionNumber: number }) => {
      const response = await fetch(`/api/prompts/${promptId}/revert/${versionNumber}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revert version');
      }
      return response.json() as Promise<PromptVersion>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompt', variables.promptId] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toastUtils.success('Reverted to previous version');
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to revert version: ${error.message}`);
    },
  });
}

// ==================== Utilities ====================

/**
 * Interpolate variables in a prompt
 */
export function useInterpolatePrompt() {
  return useMutation({
    mutationFn: async (data: InterpolatePromptRequest) => {
      const response = await fetch('/api/prompts/interpolate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to interpolate prompt');
      }
      return response.json() as Promise<{ content: string }>;
    },
  });
}

/**
 * Import prompts from JSON
 */
export function useImportPrompts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportPromptsRequest) => {
      const response = await fetch('/api/prompts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import prompts');
      }
      return response.json() as Promise<{ results: Array<{ name: string; status: string; id?: string; reason?: string }> }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['promptCollections'] });
      const imported = data.results.filter(r => r.status === 'imported').length;
      const skipped = data.results.filter(r => r.status === 'skipped').length;
      toastUtils.success(`Imported ${imported} prompts${skipped > 0 ? `, skipped ${skipped}` : ''}`);
    },
    onError: (error: Error) => {
      toastUtils.error(`Failed to import prompts: ${error.message}`);
    },
  });
}

/**
 * Export all prompts to JSON
 */
export function useExportPrompts() {
  return useQuery({
    queryKey: ['exportPrompts'],
    queryFn: async () => {
      const response = await fetch('/api/prompts/export');
      if (!response.ok) throw new Error('Failed to export prompts');
      return response.json() as Promise<ExportPromptsResponse>;
    },
    enabled: false, // Only run when explicitly refetched
  });
}
