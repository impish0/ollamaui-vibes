import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { ollamaService } from '../services/ollamaService.js';
import { titleGenerator } from '../services/titleGenerator.js';
import { ApiError } from '../middleware/errorHandler.js';
import { streamLimiter } from '../middleware/security.js';
import { logError, logInfo } from '../utils/logger.js';
import { validateBody } from '../middleware/validation.js';
import { streamChatSchema, updateOllamaConfigSchema } from '../validation/schemas.js';
import type { ChatCompletionRequest } from '../../shared/types.js';

const router = Router();

// Get available models
router.get('/models', async (_req, res, next) => {
  try {
    const models = await ollamaService.fetchModels();
    res.json({ models });
  } catch (error) {
    next(error);
  }
});

// Get cached models (faster, used by polling)
router.get('/models/cached', async (_req, res, next) => {
  try {
    const cached = ollamaService.getCachedModels();
    res.json(cached);
  } catch (error) {
    next(error);
  }
});

// Health check
router.get('/health', async (_req, res, next) => {
  try {
    const healthy = await ollamaService.healthCheck();
    res.json({ healthy, baseUrl: ollamaService.getBaseUrl() });
  } catch (error) {
    next(error);
  }
});

// Update Ollama base URL
router.post('/config', validateBody(updateOllamaConfigSchema), async (req, res, next) => {
  try {
    const { baseUrl } = req.body;

    ollamaService.setBaseUrl(baseUrl);

    // Save to settings
    await prisma.settings.upsert({
      where: { key: 'ollamaBaseUrl' },
      update: { value: baseUrl },
      create: { key: 'ollamaBaseUrl', value: baseUrl },
    });

    logInfo('Ollama base URL updated', { baseUrl });
    res.json({ success: true, baseUrl });
  } catch (error) {
    next(error);
  }
});

// Stream chat completion
router.post('/chat/stream', streamLimiter, validateBody(streamChatSchema), async (req: Request, res: Response, next) => {
  try {
    const { chatId, model, message } = req.body;

    // Get chat with messages and system prompt
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        systemPrompt: true,
      },
    });

    if (!chat) {
      throw new ApiError('Chat not found', 404);
    }

    // Build messages array for Ollama BEFORE saving anything
    const messages: ChatCompletionRequest['messages'] = [];

    // Add system prompt if exists
    if (chat.systemPrompt) {
      messages.push({
        role: 'system',
        content: chat.systemPrompt.content,
      });
    }

    // Add conversation history
    for (const msg of chat.messages) {
      messages.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      });
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Calculate estimated token count and determine context window size
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Dynamically scale context window based on conversation length
    // Supports up to 128K tokens for extended-context models
    let contextWindowSize = 8192; // 8K baseline
    if (estimatedTokens > 6000) contextWindowSize = 16384;
    if (estimatedTokens > 12000) contextWindowSize = 32768;
    if (estimatedTokens > 24000) contextWindowSize = 65536;
    if (estimatedTokens > 48000) contextWindowSize = 131072;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantResponse = '';
    let userMessageId: string | null = null;

    try {
      // Save both messages in a transaction-like operation
      // First, save the user message
      const userMessage = await prisma.message.create({
        data: {
          chatId,
          role: 'user',
          content: message,
        },
      });
      userMessageId = userMessage.id;

      // Send confirmation that user message was saved
      res.write(`data: ${JSON.stringify({ userMessageSaved: true, userMessageId: userMessage.id })}\n\n`);

      // Stream from Ollama with appropriate context window size
      for await (const chunk of ollamaService.streamChat({
        model,
        messages,
        stream: true,
        options: {
          num_ctx: contextWindowSize
        }
      })) {
        assistantResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Verify we got some response
      if (!assistantResponse || assistantResponse.trim().length === 0) {
        throw new Error('Empty response from Ollama');
      }

      // Save assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          chatId,
          role: 'assistant',
          content: assistantResponse,
          model,
        },
      });

      // Update chat model and timestamp
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          model,
          updatedAt: new Date(),
        },
      });

      // Generate title if this is the first exchange (2 messages: user + assistant)
      const messageCount = await prisma.message.count({
        where: { chatId },
      });

      if (messageCount === 2 && !chat.title) {
        // Generate title in background with better error handling
        const allMessages = await prisma.message.findMany({
          where: { chatId },
          orderBy: { createdAt: 'asc' },
        });

        titleGenerator.generateTitle(
          allMessages.map(m => ({
            id: m.id,
            chatId: m.chatId,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            model: m.model,
            createdAt: m.createdAt.toISOString(),
          })),
          model
        ).then(async (title) => {
          try {
            await prisma.chat.update({
              where: { id: chatId },
              data: { title },
            });
            logInfo('Title generated', { chatId, title });
          } catch (error) {
            logError('Failed to save title', error, { chatId });
          }
        }).catch((error) => {
          logError('Failed to generate title', error, { chatId });
        });
      }

      res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMessage.id })}\n\n`);
      res.end();
    } catch (streamError) {
      logError('Stream error occurred', streamError, { chatId, model });

      // Critical: If we saved a user message but streaming failed,
      // save an error message so the user knows what happened
      if (userMessageId) {
        try {
          await prisma.message.create({
            data: {
              chatId,
              role: 'assistant',
              content: '⚠️ Error: Failed to generate response. Please try again.',
              model,
            },
          });
          logInfo('Created error message for failed stream', { chatId });
        } catch (dbError) {
          logError('Failed to create error message', dbError, { chatId });
        }
      }

      res.write(`data: ${JSON.stringify({
        error: 'Stream error occurred',
        message: streamError instanceof Error ? streamError.message : 'Unknown error',
      })}\n\n`);
      res.end();
      throw streamError;
    }
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      logError('Error during streaming after headers sent', error, { chatId });
      res.end();
    }
  }
});

export default router;
