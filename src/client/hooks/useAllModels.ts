import { useQuery } from '@tanstack/react-query';
import { ollamaApi, providersApi } from '../services/api';

/**
 * Unified model interface combining Ollama and provider models
 */
export interface UnifiedModel {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'groq' | 'google';
  size?: number;
  details?: any;
}

/**
 * Hook to fetch all available models (Ollama + API providers)
 * Returns a unified list of models from all sources
 */
export const useAllModels = () => {
  return useQuery({
    queryKey: ['models', 'unified'] as const,
    queryFn: async () => {
      // Fetch both Ollama and provider models in parallel
      const [ollamaResponse, providersResponse] = await Promise.allSettled([
        ollamaApi.getCachedModels(),
        providersApi.getModels(),
      ]);

      const models: UnifiedModel[] = [];

      // Add Ollama models
      if (ollamaResponse.status === 'fulfilled') {
        const ollamaModels = ollamaResponse.value.models.map((model) => ({
          id: model.name,
          name: model.name,
          provider: 'ollama' as const,
          size: model.size,
          details: model.details,
        }));
        models.push(...ollamaModels);
      } else {
        console.warn('Failed to fetch Ollama models:', ollamaResponse.reason);
      }

      // Add provider models
      if (providersResponse.status === 'fulfilled') {
        const providerModels = providersResponse.value.models.map((model) => ({
          id: model.id,
          name: model.name,
          provider: model.provider as 'openai' | 'anthropic' | 'groq' | 'google',
        }));
        models.push(...providerModels);
      } else {
        console.warn('Failed to fetch provider models:', providersResponse.reason);
      }

      return models;
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchIntervalInBackground: false,
  });
};

/**
 * Hook to refresh models from a specific provider
 */
export const useRefreshProviderModels = () => {
  return async (provider: string) => {
    try {
      await providersApi.refreshModels(provider);
    } catch (error) {
      console.error(`Failed to refresh models for ${provider}:`, error);
      throw error;
    }
  };
};
