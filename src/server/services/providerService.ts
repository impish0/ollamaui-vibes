import { prisma } from '../db.js';
import { decryptApiKey } from '../utils/encryption.js';
import type { ChatCompletionRequest } from '../../shared/types.js';

export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * Provider Service - Routes chat requests to different AI providers
 * Supports: OpenAI, Anthropic, Groq, Google AI, LM Studio
 */
class ProviderService {
  /**
   * Get the provider for a given model name
   */
  async getProviderForModel(modelName: string): Promise<string | null> {
    const providers = await prisma.provider.findMany({
      where: { enabled: true },
      select: {
        name: true,
        models: true,
      },
    });

    for (const provider of providers) {
      if (provider.models) {
        try {
          const models = JSON.parse(provider.models) as string[];
          if (models.includes(modelName)) {
            return provider.name;
          }
        } catch (error) {
          console.error(`Failed to parse models for ${provider.name}:`, error);
        }
      }
    }

    return null; // Model not found in any provider (likely Ollama)
  }

  /**
   * Get decrypted API key for a provider
   */
  async getApiKey(providerName: string): Promise<string | null> {
    const provider = await prisma.provider.findUnique({
      where: { name: providerName },
      select: { apiKey: true },
    });

    if (!provider) return null;

    try {
      return decryptApiKey(provider.apiKey);
    } catch (error) {
      console.error(`Failed to decrypt API key for ${providerName}:`, error);
      return null;
    }
  }

  /**
   * Get base URL for a provider (for providers with custom endpoints like LM Studio)
   */
  async getBaseUrl(providerName: string): Promise<string | null> {
    const provider = await prisma.provider.findUnique({
      where: { name: providerName },
      select: { baseUrl: true },
    });

    return provider?.baseUrl || null;
  }

  /**
   * Stream chat completion from any provider
   */
  async *streamChat(
    provider: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamChunk> {
    // LM Studio may not require an API key (local server)
    const apiKey = await this.getApiKey(provider);
    if (!apiKey && provider !== 'lmstudio') {
      throw new Error(`No API key found for provider: ${provider}`);
    }

    switch (provider) {
      case 'openai':
        yield* this.streamOpenAI(apiKey!, request);
        break;
      case 'anthropic':
        yield* this.streamAnthropic(apiKey!, request);
        break;
      case 'groq':
        yield* this.streamGroq(apiKey!, request);
        break;
      case 'google':
        yield* this.streamGoogle(apiKey!, request);
        break;
      case 'lmstudio':
        yield* this.streamLMStudio(apiKey || '', request);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * OpenAI Streaming
   */
  private async *streamOpenAI(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        temperature: request.options?.temperature,
        top_p: request.options?.top_p,
        max_tokens: request.options?.num_predict,
        stop: request.options?.stop,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from OpenAI');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch (e) {
            console.error('Failed to parse OpenAI chunk:', e);
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Anthropic Streaming
   */
  private async *streamAnthropic(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamChunk> {
    // Convert messages to Anthropic format (system message separate)
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        system: systemMessage?.content,
        max_tokens: request.options?.num_predict || 4096,
        temperature: request.options?.temperature,
        top_p: request.options?.top_p,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from Anthropic');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            // Anthropic sends different event types
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield { content: data.delta.text, done: false };
            } else if (data.type === 'message_stop') {
              yield { content: '', done: true };
            }
          } catch (e) {
            console.error('Failed to parse Anthropic chunk:', e);
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Groq Streaming (OpenAI-compatible)
   */
  private async *streamGroq(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        temperature: request.options?.temperature,
        top_p: request.options?.top_p,
        max_tokens: request.options?.num_predict,
        stop: request.options?.stop,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from Groq');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch (e) {
            console.error('Failed to parse Groq chunk:', e);
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Google AI Streaming
   */
  private async *streamGoogle(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamChunk> {
    // Convert messages to Google format
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messages = request.messages.filter((m) => m.role !== 'system');

    // Build contents array (Google uses parts format)
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Add system instruction if present
    const systemInstruction = systemMessage
      ? { parts: [{ text: systemMessage.content }] }
      : undefined;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: request.options?.temperature,
            topP: request.options?.top_p,
            maxOutputTokens: request.options?.num_predict,
            stopSequences: request.options?.stop,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from Google AI');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Google sends JSON objects separated by newlines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield { content: text, done: false };
            }
          } catch (e) {
            console.error('Failed to parse Google chunk:', e);
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * LM Studio Streaming (OpenAI-compatible, local server)
   */
  private async *streamLMStudio(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamChunk> {
    // Get custom base URL for LM Studio (default: http://localhost:1234)
    const baseUrl = await this.getBaseUrl('lmstudio') || 'http://localhost:1234';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided (some LM Studio setups may require it)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        temperature: request.options?.temperature,
        top_p: request.options?.top_p,
        max_tokens: request.options?.num_predict,
        stop: request.options?.stop,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from LM Studio');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch (e) {
            console.error('Failed to parse LM Studio chunk:', e);
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }
}

export const providerService = new ProviderService();
