import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { ollamaApi } from '../services/api';

export const useModels = () => {
  const { models, lastModelsFetch, setModels } = useChatStore();

  // Poll for models every 15 seconds
  useEffect(() => {
    // Load immediately
    loadModels();

    // Then poll
    const interval = setInterval(() => {
      loadCachedModels();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    try {
      const { models: fetchedModels } = await ollamaApi.getModels();
      setModels(fetchedModels, Date.now());
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadCachedModels = async () => {
    try {
      const { models: cachedModels, lastFetch } = await ollamaApi.getCachedModels();
      setModels(cachedModels, lastFetch);
    } catch (error) {
      console.error('Failed to load cached models:', error);
    }
  };

  return {
    models,
    lastModelsFetch,
    refreshModels: loadModels,
  };
};
