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

export interface ModelParameters {
  temperature?: number; // 0.0 - 2.0, default 0.7
  top_p?: number; // 0.0 - 1.0, default 0.9
  top_k?: number; // 1 - 100, default 40
  repeat_penalty?: number; // 0.0 - 2.0, default 1.1
  seed?: number; // For reproducibility
  num_ctx?: number; // Context window size (e.g., 4096, 8192, 32768)
  num_predict?: number; // Max tokens to generate
  stop?: string[]; // Stop sequences
}

export interface ModelParameterPreset {
  id: string;
  name: string;
  description?: string;
  parameters: ModelParameters;
  createdAt: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream: boolean;
  options?: ModelParameters;
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

export interface PaginatedMessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// RAG Types
export interface Collection {
  id: string;
  name: string;
  description: string | null;
  embedding: string;
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  collectionId: string;
  collection?: Collection;
  filename: string;
  contentType: string;
  content: string;
  metadata: string | null;
  chunkCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  embedding?: string;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
}

export interface UploadDocumentRequest {
  collectionId: string;
  file: File;
}

export interface RAGSearchResult {
  documentId: string;
  filename: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RAGContext {
  results: RAGSearchResult[];
  query: string;
}

// Model Management Types
export interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
    families?: string[];
  };
  template?: string;
  license?: string;
}

export interface ModelPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface PullModelRequest {
  name: string;
}

export interface CreateModelRequest {
  name: string;
  modelfile: string;
}

export interface ModelShowResponse {
  license: string;
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// Playground Types
export interface PlaygroundComparison {
  id: string;
  prompt: string;
  models: string[];
  parameters: Record<string, ModelParameters>; // model name -> parameters
  responses: Record<string, string>; // model name -> response
  timestamps: Record<string, number>; // model name -> duration in ms
  createdAt: string;
}

export interface PlaygroundCompareRequest {
  prompt: string;
  models: Array<{
    name: string;
    parameters?: ModelParameters;
  }>;
  systemPrompt?: string;
}

// Benchmark Types
export interface BenchmarkResult {
  id: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTime: number; // milliseconds
  tokensPerSecond: number;
  timeToFirstToken: number; // milliseconds
  memoryUsed?: number; // MB
  parameters: ModelParameters;
  createdAt: string;
}

export interface BenchmarkRequest {
  models: string[];
  prompts: string[];
  parameters?: ModelParameters;
  iterations?: number;
}

// System Resource Types
export interface SystemResources {
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // MB
    total: number; // MB
    percentage: number;
  };
  gpu?: {
    usage: number; // percentage
    memory: {
      used: number; // MB
      total: number; // MB
    };
  };
}

// Prompt Version Control Types
export interface PromptCollection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  prompts?: PromptTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  collectionId: string | null;
  collection?: PromptCollection | null;
  currentVersionId: string | null;
  currentVersion?: PromptVersion | null;
  versions?: PromptVersion[];
  tags: string | null; // JSON array of tags
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  prompt?: PromptTemplate;
  content: string;
  variables: string | null; // JSON array of variable names (e.g., ["name", "product"])
  versionNumber: number;
  changeDescription: string | null;
  createdAt: string;
}

export interface CreatePromptCollectionRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdatePromptCollectionRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface CreatePromptTemplateRequest {
  name: string;
  description?: string;
  collectionId?: string;
  content: string; // Initial version content
  tags?: string[]; // Array of tags
  isFavorite?: boolean;
}

export interface UpdatePromptTemplateRequest {
  name?: string;
  description?: string;
  collectionId?: string;
  content?: string; // Creates new version if provided
  changeDescription?: string; // Description for new version
  tags?: string[];
  isFavorite?: boolean;
}

export interface CreatePromptVersionRequest {
  promptId: string;
  content: string;
  changeDescription?: string;
}

export interface PromptDiff {
  additions: Array<{
    line: number;
    content: string;
  }>;
  deletions: Array<{
    line: number;
    content: string;
  }>;
  unchanged: Array<{
    line: number;
    content: string;
  }>;
}

export interface PromptVariableValue {
  name: string;
  value: string;
}

export interface InterpolatePromptRequest {
  content: string;
  variables: PromptVariableValue[];
}

export interface ImportPromptsRequest {
  prompts: Array<{
    name: string;
    description?: string;
    content: string;
    collectionName?: string;
    tags?: string[];
  }>;
}

export interface ExportPromptsResponse {
  prompts: Array<{
    name: string;
    description: string | null;
    content: string;
    collectionName: string | null;
    tags: string[];
    versions: Array<{
      versionNumber: number;
      content: string;
      changeDescription: string | null;
      createdAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
  exportedAt: string;
}
