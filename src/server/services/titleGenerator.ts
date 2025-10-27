import { ollamaService } from './ollamaService.js';
import type { Message } from '../../shared/types.js';

export class TitleGenerator {
  async generateTitle(messages: Message[], model: string): Promise<string> {
    try {
      // Take first few messages for context
      const contextMessages = messages.slice(0, 4);
      const conversation = contextMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Based on this conversation, generate a concise 3-5 word title that captures the main topic. Only respond with the title, nothing else.

Conversation:
${conversation}

Title:`;

      const title = await ollamaService.generateCompletion(model, prompt);

      // Clean up the title
      const cleanTitle = title
        .trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
        .slice(0, 60); // Max 60 chars

      return cleanTitle || 'New Conversation';
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Conversation';
    }
  }
}

export const titleGenerator = new TitleGenerator();
