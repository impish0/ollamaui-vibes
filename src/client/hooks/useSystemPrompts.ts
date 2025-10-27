import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { systemPromptsApi } from '../services/api';

export const useSystemPrompts = () => {
  const {
    systemPrompts,
    setSystemPrompts,
    addSystemPrompt,
    updateSystemPrompt: updateInStore,
    deleteSystemPrompt: deleteFromStore,
  } = useChatStore();

  useEffect(() => {
    loadSystemPrompts();
  }, []);

  const loadSystemPrompts = async () => {
    try {
      const prompts = await systemPromptsApi.getAll();
      setSystemPrompts(prompts);
    } catch (error) {
      console.error('Failed to load system prompts:', error);
    }
  };

  const createSystemPrompt = async (name: string, content: string) => {
    try {
      const prompt = await systemPromptsApi.create({ name, content });
      addSystemPrompt(prompt);
      return prompt;
    } catch (error) {
      console.error('Failed to create system prompt:', error);
      throw error;
    }
  };

  const updateSystemPrompt = async (id: string, updates: { name?: string; content?: string }) => {
    try {
      const updated = await systemPromptsApi.update(id, updates);
      updateInStore(id, updated);
      return updated;
    } catch (error) {
      console.error('Failed to update system prompt:', error);
      throw error;
    }
  };

  const deleteSystemPrompt = async (id: string) => {
    try {
      await systemPromptsApi.delete(id);
      deleteFromStore(id);
    } catch (error) {
      console.error('Failed to delete system prompt:', error);
      throw error;
    }
  };

  return {
    systemPrompts,
    loadSystemPrompts,
    createSystemPrompt,
    updateSystemPrompt,
    deleteSystemPrompt,
  };
};
