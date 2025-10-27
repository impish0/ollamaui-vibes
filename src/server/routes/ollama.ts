import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { ollamaService } from '../services/ollamaService.js';
import { titleGenerator } from '../services/titleGenerator.js';
import { ApiError } from '../middleware/errorHandler.js';
import { streamLimiter } from '../middleware/security.js';
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
router.post('/config', async (req, res, next) => {
  try {
    const { baseUrl } = req.body;

    if (!baseUrl) {
      throw new ApiError('baseUrl is required', 400);
    }

    ollamaService.setBaseUrl(baseUrl);

    // Save to settings
    await prisma.settings.upsert({
      where: { key: 'ollamaBaseUrl' },
      update: { value: baseUrl },
      create: { key: 'ollamaBaseUrl', value: baseUrl },
    });

    res.json({ success: true, baseUrl });
  } catch (error) {
    next(error);
  }
});

// Stream chat completion
router.post('/chat/stream', streamLimiter, async (req: Request, res: Response, next) => {
  try {
    const { chatId, model, message } = req.body;

    if (!chatId || !model || !message) {
      throw new ApiError('chatId, model, and message are required', 400);
    }

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

    // Save user message
    await prisma.message.create({
      data: {
        chatId,
        role: 'user',
        content: message,
      },
    });

    // Build messages array for Ollama
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

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantResponse = '';

    try {
      // Stream from Ollama
      for await (const chunk of ollamaService.streamChat({ model, messages, stream: true })) {
        assistantResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      console.log(`[Stream Complete] Saving assistant message for chat ${chatId}, length: ${assistantResponse.length}`);

      // Save assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          chatId,
          role: 'assistant',
          content: assistantResponse,
          model,
        },
      });

      console.log(`[Message Saved] Assistant message ID: ${assistantMessage.id}`);

      // Update chat model
      await prisma.chat.update({
        where: { id: chatId },
        data: { model },
      });

      console.log(`[Chat Updated] Chat ${chatId} model updated to ${model}`);

      // Generate title if this is the first exchange (2 messages: user + assistant)
      const messageCount = await prisma.message.count({
        where: { chatId },
      });

      if (messageCount === 2 && !chat.title) {
        // Generate title in background
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
        ).then(title => {
          prisma.chat.update({
            where: { id: chatId },
            data: { title },
          }).catch(console.error);
        }).catch(console.error);
      }

      res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMessage.id })}\n\n`);
      res.end();
    } catch (streamError) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
      res.end();
      throw streamError;
    }
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      console.error('Error during streaming:', error);
      res.end();
    }
  }
});

export default router;
