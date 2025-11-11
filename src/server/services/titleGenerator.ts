import { ollamaService } from './ollamaService.js';
import { providerService } from './providerService.js';
import { settingsService } from './settingsService.js';
import type { Message } from '../../shared/types.js';

export class TitleGenerator {
  /**
   * Determine if a model is an Ollama model or an API provider model
   * @param modelName - Name of the model
   * @returns Provider name or 'ollama'
   */
  private async getModelProvider(modelName: string): Promise<string | null> {
    try {
      // Check if model exists in any provider
      const provider = await providerService.getProviderForModel(modelName);
      return provider || 'ollama';
    } catch (error) {
      console.error('Error determining model provider:', error);
      return 'ollama'; // Default to Ollama
    }
  }

  /**
   * Generate a title for a conversation using configurable settings
   * @param messages - Array of messages in the conversation
   * @param chatModel - Model used in the chat
   * @returns Generated title string
   */
  async generateTitle(messages: Message[], chatModel: string): Promise<string> {
    try {
      // Load title generation settings
      const settings = await settingsService.getSettings();
      const {
        prompt: promptTemplate,
        maxLength,
        useCurrentChatModel,
        specificModel
      } = settings.titleGeneration;

      // Determine which model to use for title generation
      let modelToUse = chatModel; // Default to chat's model

      if (!useCurrentChatModel) {
        // Use specific model from settings
        if (specificModel) {
          modelToUse = specificModel;
        } else {
          // Fall back to first available Ollama model
          try {
            const ollamaModels = await ollamaService.listModels();
            if (ollamaModels.length > 0) {
              modelToUse = ollamaModels[0].name;
            }
          } catch (error) {
            console.warn('Failed to get Ollama models for title generation:', error);
            // Keep using chatModel as fallback
          }
        }
      }

      // Take first few messages for context (up to 4 messages or 2000 chars)
      const contextMessages = messages.slice(0, 4);
      const conversation = contextMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n')
        .slice(0, 2000); // Limit context size

      // Replace {conversation} placeholder in the prompt template
      const prompt = promptTemplate.replace('{conversation}', conversation);

      // Determine provider and generate title
      const provider = await this.getModelProvider(modelToUse);
      let title: string;

      if (provider === 'ollama') {
        // Use Ollama service
        title = await ollamaService.generateCompletion(modelToUse, prompt);
      } else {
        // Use provider service (OpenAI, Anthropic, Groq, Google)
        const messages = [
          { role: 'user' as const, content: prompt }
        ];

        let fullResponse = '';
        for await (const chunk of providerService.streamChat(provider, {
          model: modelToUse,
          messages,
        })) {
          if (chunk.content) {
            fullResponse += chunk.content;
          }
          if (chunk.done) {
            break;
          }
        }
        title = fullResponse;
      }

      // Clean up the title
      const cleanTitle = title
        .trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
        .replace(/\n.*/g, '') // Remove anything after first newline
        .slice(0, maxLength); // Use configured max length

      return cleanTitle || 'New Conversation';
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Conversation';
    }
  }
}

export const titleGenerator = new TitleGenerator();
