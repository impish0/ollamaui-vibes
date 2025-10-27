export interface Chat {
  id: string;
  title: string | null;
  model: string;
  systemPromptId: string | null;
  systemPrompt?: SystemPrompt | null;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  createdAt: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream: boolean;
  options?: {
    num_ctx?: number; // Context window size (e.g., 4096, 8192, 32768)
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface StreamChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface CreateChatRequest {
  model: string;
  systemPromptId?: string;
}

export interface UpdateChatRequest {
  title?: string;
  model?: string;
  systemPromptId?: string;
}

export interface CreateMessageRequest {
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
}

export interface CreateSystemPromptRequest {
  name: string;
  content: string;
}

export interface UpdateSystemPromptRequest {
  name?: string;
  content?: string;
}

export interface Settings {
  ollamaBaseUrl: string;
}
