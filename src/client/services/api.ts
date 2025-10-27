import type {
  Chat,
  Message,
  SystemPrompt,
  OllamaModel,
  CreateChatRequest,
  UpdateChatRequest,
  CreateMessageRequest,
  CreateSystemPromptRequest,
  UpdateSystemPromptRequest,
} from '../../shared/types';

const API_BASE = '/api';

// Fetch wrapper with error handling
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Chats API
export const chatsApi = {
  getAll: () => fetchJson<Chat[]>(`${API_BASE}/chats`),

  getById: (id: string) => fetchJson<Chat>(`${API_BASE}/chats/${id}`),

  create: (data: CreateChatRequest) =>
    fetchJson<Chat>(`${API_BASE}/chats`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateChatRequest) =>
    fetchJson<Chat>(`${API_BASE}/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetch(`${API_BASE}/chats/${id}`, { method: 'DELETE' }),
};

// Messages API
export const messagesApi = {
  getByChatId: (chatId: string) =>
    fetchJson<Message[]>(`${API_BASE}/messages/chat/${chatId}`),

  create: (data: CreateMessageRequest) =>
    fetchJson<Message>(`${API_BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetch(`${API_BASE}/messages/${id}`, { method: 'DELETE' }),
};

// System Prompts API
export const systemPromptsApi = {
  getAll: () => fetchJson<SystemPrompt[]>(`${API_BASE}/system-prompts`),

  getById: (id: string) =>
    fetchJson<SystemPrompt>(`${API_BASE}/system-prompts/${id}`),

  create: (data: CreateSystemPromptRequest) =>
    fetchJson<SystemPrompt>(`${API_BASE}/system-prompts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateSystemPromptRequest) =>
    fetchJson<SystemPrompt>(`${API_BASE}/system-prompts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetch(`${API_BASE}/system-prompts/${id}`, { method: 'DELETE' }),
};

// Ollama API
export const ollamaApi = {
  getModels: () =>
    fetchJson<{ models: OllamaModel[] }>(`${API_BASE}/ollama/models`),

  getCachedModels: () =>
    fetchJson<{ models: OllamaModel[]; lastFetch: number }>(
      `${API_BASE}/ollama/models/cached`
    ),

  healthCheck: () =>
    fetchJson<{ healthy: boolean; baseUrl: string }>(`${API_BASE}/ollama/health`),

  updateConfig: (baseUrl: string) =>
    fetchJson<{ success: boolean; baseUrl: string }>(
      `${API_BASE}/ollama/config`,
      {
        method: 'POST',
        body: JSON.stringify({ baseUrl }),
      }
    ),

  // Stream chat completion using EventSource
  streamChat: async function* (
    chatId: string,
    model: string,
    message: string,
    opts?: { signal?: AbortSignal }
  ): AsyncGenerator<{ content?: string; done?: boolean; error?: string; messageId?: string }> {
    const response = await fetch(`${API_BASE}/ollama/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, model, message }),
      signal: opts?.signal,
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.statusText}`);
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
      const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data:'));

      for (const line of lines) {
        const data = line.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(data);
          yield parsed;
          if (parsed.done) {
            return;
          }
        } catch (e) {
          console.warn('Failed to parse SSE data:', data);
        }
      }
    }
  },
};
