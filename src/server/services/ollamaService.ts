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

  async *streamChat(request: ChatCompletionRequest, timeoutMs: number = 120000): AsyncGenerator<string> {
    // Create AbortController for timeout and cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const payload: any = {
        model: request.model,
        messages: request.messages,
        stream: true,
      };

      if (request.options) {
        payload.options = request.options;
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController.signal, // Add abort signal
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Ollama');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lastChunkTime = Date.now();
      const chunkTimeoutMs = 30000; // 30 seconds between chunks

      while (true) {
        // Check if too much time has passed since last chunk
        if (Date.now() - lastChunkTime > chunkTimeoutMs) {
          throw new Error('Stream timeout: No data received for 30 seconds');
        }

        const { done, value } = await reader.read();
        if (done) break;

        lastChunkTime = Date.now();
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data: StreamChunk = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) {
              clearTimeout(timeoutId);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line, e);
          }
        }
      }

      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);

      // Better error messages for different failure scenarios
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Stream timeout after ${timeoutMs / 1000} seconds`);
        }
        if (error.message.includes('fetch failed')) {
          throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running?`);
        }
      }

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

  // Model Management Methods
  async pullModel(modelName: string, onProgress?: (progress: any) => void): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
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
            const progress = JSON.parse(line);
            if (onProgress) {
              onProgress(progress);
            }
          } catch (e) {
            console.warn('Failed to parse progress:', line);
          }
        }
      }

      // Refresh models cache after pull
      await this.fetchModels();
    } catch (error) {
      console.error('Error pulling model:', error);
      throw error;
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`);
      }

      // Refresh models cache after delete
      await this.fetchModels();
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting model info:', error);
      throw error;
    }
  }

  async createModel(name: string, modelfile: string, onProgress?: (progress: any) => void): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, modelfile }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create model: ${response.statusText}`);
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
            const progress = JSON.parse(line);
            if (onProgress) {
              onProgress(progress);
            }
          } catch (e) {
            console.warn('Failed to parse progress:', line);
          }
        }
      }

      // Refresh models cache after create
      await this.fetchModels();
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }
}

// Singleton instance
export const ollamaService = new OllamaService(process.env.OLLAMA_BASE_URL);
