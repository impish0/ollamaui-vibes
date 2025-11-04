import { ollamaService } from './ollamaService.js';
import { settingsService } from './settingsService.js';
import type { Message } from '../../shared/types.js';

export class TitleGenerator {
  /**
   * Generate a title for a conversation using configurable settings
   * @param messages - Array of messages in the conversation
   * @param model - Model to use for generation
   * @returns Generated title string
   */
  async generateTitle(messages: Message[], model: string): Promise<string> {
    try {
      // Load title generation settings
      const settings = await settingsService.getSettings();
      const { prompt: promptTemplate, maxLength } = settings.titleGeneration;

      // Take first few messages for context (up to 4 messages or 2000 chars)
      const contextMessages = messages.slice(0, 4);
      const conversation = contextMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n')
        .slice(0, 2000); // Limit context size

      // Replace {conversation} placeholder in the prompt template
      const prompt = promptTemplate.replace('{conversation}', conversation);

      const title = await ollamaService.generateCompletion(model, prompt);

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
