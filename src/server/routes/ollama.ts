import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { ollamaService } from '../services/ollamaService.js';
import { titleGenerator } from '../services/titleGenerator.js';
import { documentService } from '../services/documentService.js';
import { vectorService } from '../services/vectorService.js';
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

// Get embedding-capable models
router.get('/models/embeddings', async (_req, res, next) => {
  try {
    const allModels = await ollamaService.fetchModels();

    // Common embedding model patterns
    const embeddingPatterns = [
      /embed/i,
      /nomic/i,
      /bge/i,
      /mxbai/i,
      /arctic.*embed/i,
      /qwen.*embed/i,
      /e5/i,
      /gte/i
    ];

    const embeddingModels = allModels.filter(model =>
      embeddingPatterns.some(pattern => pattern.test(model.name))
    );

    // Add recommended models info
    const recommended = [
      'qwen3-embedding:8b',
      'nomic-embed-text',
      'mxbai-embed-large',
      'bge-m3',
      'snowflake-arctic-embed:335m'
    ];

    res.json({
      models: embeddingModels,
      recommended: recommended.filter(r =>
        embeddingModels.some(m => m.name.includes(r.split(':')[0]))
      ),
      allRecommended: recommended // Full list for UI to suggest pulling
    });
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
  const { chatId, model, message, collectionIds } = req.body;

  try {

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

    // RAG: Retrieve relevant context from collections if specified
    let ragContext = '';
    if (collectionIds && Array.isArray(collectionIds) && collectionIds.length > 0 && vectorService.isAvailable()) {
      try {
        logInfo('RAG search initiated', { collectionIds, query: message.substring(0, 100) });

        const allResults = [];
        for (const collectionId of collectionIds) {
          logInfo('Searching collection', { collectionId });
          const results = await documentService.searchDocuments(collectionId, message, 3);
          logInfo('Search results for collection', { collectionId, resultCount: results.length });
          allResults.push(...results);
        }

        // Sort by score and take top 5 overall
        allResults.sort((a, b) => b.score - a.score);
        const topResults = allResults.slice(0, 5);

        if (topResults.length > 0) {
          ragContext = '=== RELEVANT CONTEXT FROM DOCUMENTS ===\n\n';
          topResults.forEach((result, index) => {
            ragContext += `[Source ${index + 1}: ${result.filename}]\n${result.content}\n\n`;
          });
          ragContext += '=== END OF CONTEXT ===\n\n';

          logInfo('RAG context retrieved', { resultCount: topResults.length, totalCharacters: ragContext.length });

          // Inject RAG context as a system message
          messages.push({
            role: 'system',
            content: ragContext + 'Use the above context to help answer the user\'s question. If the context is relevant, cite the source. If not relevant, answer from your general knowledge.'
          });
        } else {
          logInfo('RAG search completed but no results found', {
            collectionIds,
            collectionsSearched: collectionIds.length,
            message: 'Vector indexes may be empty or query returned no matches'
          });
        }
      } catch (ragError) {
        logError('RAG search failed, continuing without context', ragError);
        // Continue without RAG context rather than failing the request
      }
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
    const startTime = Date.now();

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

      // Log the full prompt being sent to the model
      logInfo('📝 PROMPT SENT TO MODEL', {
        chatId,
        model,
        estimatedTokens,
        contextWindowSize,
        ragEnabled: !!(collectionIds && collectionIds.length > 0),
        collectionCount: collectionIds?.length || 0,
        messagesCount: messages.length,
      });

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

      // Save detailed prompt log to database
      const responseTime = Date.now() - startTime;
      const responseTokens = Math.ceil(assistantResponse.length / 4); // Rough estimate

      await prisma.promptLog.create({
        data: {
          chatId,
          model,
          messages: JSON.stringify(messages, null, 2),
          ragContext: ragContext || null,
          collectionIds: collectionIds ? JSON.stringify(collectionIds) : null,
          estimatedTokens,
          contextWindowSize,
          responseTokens,
          response: assistantResponse,
          responseTime,
          userMessage: message,
        },
      });

      logInfo('✅ RESPONSE COMPLETED', {
        chatId,
        responseTime: `${responseTime}ms`,
        responseTokens,
        totalTokens: estimatedTokens + responseTokens,
      });

      // Title generation logic with settings-based triggers
      const messageCount = await prisma.message.count({
        where: { chatId },
      });

      // Load settings to check if title generation should run
      const { settingsService } = await import('../services/settingsService.js');
      const settings = await settingsService.getSettings();
      const {
        enabled,
        triggerAfterMessages,
        regenerateAfterMessages,
      } = settings.titleGeneration;

      // Check if we should generate/regenerate title
      const shouldGenerateTitle = enabled && (
        // Initial generation: after N messages and no title exists
        (messageCount === triggerAfterMessages && !chat.title) ||
        // Regeneration: after N more messages (if enabled)
        (regenerateAfterMessages > 0 && messageCount === regenerateAfterMessages)
      );

      if (shouldGenerateTitle) {
        // Generate title in background with better error handling
        const allMessages = await prisma.message.findMany({
          where: { chatId },
          orderBy: { createdAt: 'asc' },
        });

        titleGenerator.generateTitle(
          allMessages.map((m: typeof allMessages[0]) => ({
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
            const action = messageCount === triggerAfterMessages ? 'generated' : 'regenerated';
            logInfo(`Title ${action}`, { chatId, title, messageCount });
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

      // Log the error to database
      const responseTime = Date.now() - startTime;
      try {
        await prisma.promptLog.create({
          data: {
            chatId,
            model,
            messages: JSON.stringify(messages, null, 2),
            ragContext: ragContext || null,
            collectionIds: collectionIds ? JSON.stringify(collectionIds) : null,
            estimatedTokens,
            contextWindowSize,
            responseTokens: null,
            response: null,
            responseTime,
            error: streamError instanceof Error ? streamError.message : String(streamError),
            userMessage: message,
          },
        });
      } catch (logError) {
        // If logging fails, just log to console
        console.error('Failed to save error to prompt log:', logError);
      }

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
