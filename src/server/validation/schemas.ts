import { z } from 'zod';

/**
 * Validation schemas for all API endpoints
 * These ensure data integrity and provide clear error messages
 */

// Chat schemas
export const createChatSchema = z.object({
  model: z.string().min(1, 'Model is required').max(200),
  systemPromptId: z.string().optional(),
});

export const updateChatSchema = z.object({
  title: z.string().max(500).optional(),
  model: z.string().min(1).max(200).optional(),
  systemPromptId: z.string().nullable().optional(),
});

// Message schemas
export const createMessageSchema = z.object({
  chatId: z.string().cuid('Invalid chat ID'),
  role: z.enum(['user', 'assistant', 'system'], {
    errorMap: () => ({ message: 'Role must be user, assistant, or system' }),
  }),
  content: z.string().min(1, 'Content cannot be empty').max(100000, 'Content too large (max 100KB)'),
  model: z.string().max(200).optional(),
});

export const streamChatSchema = z.object({
  chatId: z.string().cuid('Invalid chat ID'),
  model: z.string().min(1, 'Model is required').max(200),
  message: z.string().min(1, 'Message cannot be empty').max(100000, 'Message too large (max 100KB)'),
});

// System prompt schemas
export const createSystemPromptSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long (max 100 characters)')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content too large (max 10KB)'),
});

export const updateSystemPromptSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long (max 100 characters)')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content too large (max 10KB)')
    .optional(),
});

// Ollama config schema
export const updateOllamaConfigSchema = z.object({
  baseUrl: z.string()
    .url('Invalid URL format')
    .regex(/^https?:\/\//, 'URL must start with http:// or https://')
    .max(500, 'URL too long'),
});

// Query parameter schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Cursor-based pagination for messages (better for infinite scroll)
export const messagesPaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(), // Message ID to start from
});

export const chatIdParamSchema = z.object({
  chatId: z.string().cuid('Invalid chat ID'),
});

export const systemPromptIdParamSchema = z.object({
  promptId: z.string().cuid('Invalid prompt ID'),
});

// Type exports for use in routes
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type StreamChatInput = z.infer<typeof streamChatSchema>;
export type CreateSystemPromptInput = z.infer<typeof createSystemPromptSchema>;
export type UpdateSystemPromptInput = z.infer<typeof updateSystemPromptSchema>;
export type UpdateOllamaConfigInput = z.infer<typeof updateOllamaConfigSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type MessagesPaginationInput = z.infer<typeof messagesPaginationSchema>;
