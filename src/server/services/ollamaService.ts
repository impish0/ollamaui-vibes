import type { OllamaModel, OllamaModelsResponse, ChatCompletionRequest, StreamChunk } from '../../shared/types.js';

export class OllamaService {
  private baseUrl: string;
  private modelsCache: OllamaModel[] = [];
  private lastModelsFetch: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Start polling for models every 15 seconds
  startModelPolling(intervalMs: number = 15000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Fetch immediately
    this.fetchModels().catch(console.error);

    // Then poll at intervals
    this.pollingInterval = setInterval(() => {
      this.fetchModels().catch(console.error);
    }, intervalMs);
  }

  stopModelPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async fetchModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json() as OllamaModelsResponse;
      this.modelsCache = data.models || [];
      this.lastModelsFetch = Date.now();
      return this.modelsCache;
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw error;
    }
  }

  getCachedModels(): { models: OllamaModel[]; lastFetch: number } {
    return {
      models: this.modelsCache,
      lastFetch: this.lastModelsFetch,
    };
  }

  async *streamChat(request: ChatCompletionRequest): AsyncGenerator<string> {
    try {
      const payload: any = {
        model: request.model,
        messages: request.messages,
        stream: true,
      };

      // Add options if provided
      if (request.options) {
        payload.options = request.options;
      }

      console.log(`[Ollama Service] Sending ${request.messages.length} messages to Ollama`);
      console.log(`[Ollama Service] Payload size: ${JSON.stringify(payload).length} bytes`);
      if (request.options?.num_ctx) {
        console.log(`[Ollama Service] Context window size: ${request.options.num_ctx}`);
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data: StreamChunk = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) {
              return;
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line);
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from Ollama:', error);
      throw error;
    }
  }

  async generateCompletion(model: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const data = await response.json() as { response?: string };
      return data.response || '';
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const ollamaService = new OllamaService(process.env.OLLAMA_BASE_URL);
