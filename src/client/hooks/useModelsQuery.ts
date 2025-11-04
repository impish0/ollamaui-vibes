import { useQuery } from '@tanstack/react-query';
import { ollamaApi } from '../services/api';
import { queryKeys } from '../lib/react-query';

/**
 * React Query hooks for Ollama models
 * Provides intelligent caching and automatic polling
 */

/**
 * Fetch Ollama models (direct fetch, not cached)
 */
export const useModels = () => {
  return useQuery({
    queryKey: queryKeys.models.all,
    queryFn: async () => {
      const response = await ollamaApi.getModels();
      return response.models;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (models don't change frequently)
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
  });
};

/**
 * Fetch cached Ollama models (faster)
 */
export const useCachedModels = () => {
  return useQuery({
    queryKey: queryKeys.models.cached,
    queryFn: async () => {
      const response = await ollamaApi.getCachedModels();
      return {
        models: response.models,
        lastFetch: response.lastFetch,
      };
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000, // Poll every 15 seconds (matches server polling)
    refetchIntervalInBackground: true, // Keep polling in background
  });
};

/**
 * Check Ollama health status
 */
export const useOllamaHealth = () => {
  return useQuery({
    queryKey: queryKeys.ollama.health,
    queryFn: () => ollamaApi.healthCheck(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Check every 30 seconds
    retry: 1, // Only retry once for health checks
  });
};
