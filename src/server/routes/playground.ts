import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ollamaService } from '../services/ollamaService.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { ModelParameters } from '../../shared/types.js';

const router = Router();

// Validation schema
const PlaygroundCompareSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  models: z.array(z.object({
    name: z.string().min(1, 'Model name is required'),
    parameters: z.object({
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      top_k: z.number().int().min(1).max(100).optional(),
      repeat_penalty: z.number().min(0).max(2).optional(),
      seed: z.number().int().optional(),
      num_ctx: z.number().int().optional(),
      num_predict: z.number().int().optional(),
      stop: z.array(z.string()).optional(),
    }).optional(),
  })).min(1).max(4, 'Maximum 4 models can be compared'),
  systemPrompt: z.string().optional(),
});

/**
 * POST /api/playground/compare/stream
 * Stream responses from multiple models simultaneously
 * Returns Server-Sent Events with model-specific updates
 */
router.post('/compare/stream', async (req: Request, res: Response) => {
  try {
    const { prompt, models, systemPrompt } = PlaygroundCompareSchema.parse(req.body);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Track completion state
    const completedModels = new Set<string>();
    const modelErrors = new Map<string, string>();
    const startTimes = new Map<string, number>();
    const firstTokenTimes = new Map<string, number>();

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Send initial start event
    res.write(`data: ${JSON.stringify({ type: 'start', models: models.map(m => m.name) })}\n\n`);

    // Stream from all models in parallel
    const streamPromises = models.map(async (model) => {
      const modelName = model.name;
      startTimes.set(modelName, Date.now());

      try {
        // Send model start event
        res.write(`data: ${JSON.stringify({
          type: 'model_start',
          model: modelName
        })}\n\n`);

        let fullResponse = '';
        let tokenCount = 0;

        // Stream from this model
        const stream = ollamaService.streamChat({
          model: modelName,
          messages,
          stream: true,
          options: model.parameters as ModelParameters,
        });

        for await (const chunk of stream) {
          if (!firstTokenTimes.has(modelName)) {
            firstTokenTimes.set(modelName, Date.now());
          }

          fullResponse += chunk;
          tokenCount++;

          // Send chunk event
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            model: modelName,
            content: chunk,
            fullContent: fullResponse,
            tokenCount,
          })}\n\n`);
        }

        const endTime = Date.now();
        const totalTime = endTime - (startTimes.get(modelName) || endTime);
        const timeToFirstToken = (firstTokenTimes.get(modelName) || endTime) - (startTimes.get(modelName) || endTime);
        const tokensPerSecond = tokenCount / (totalTime / 1000);

        // Send model complete event with metrics
        res.write(`data: ${JSON.stringify({
          type: 'model_complete',
          model: modelName,
          fullContent: fullResponse,
          metrics: {
            totalTime,
            timeToFirstToken,
            tokenCount,
            tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
          },
        })}\n\n`);

        completedModels.add(modelName);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        modelErrors.set(modelName, errorMessage);

        // Send model error event
        res.write(`data: ${JSON.stringify({
          type: 'model_error',
          model: modelName,
          error: errorMessage,
        })}\n\n`);

        completedModels.add(modelName);
      }
    });

    // Wait for all models to complete
    await Promise.all(streamPromises);

    // Send final complete event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      completedModels: Array.from(completedModels),
      errors: Object.fromEntries(modelErrors),
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Playground compare error:', error);

    if (error instanceof z.ZodError) {
      if (!res.headersSent) {
        throw new ApiError('Invalid request: ' + error.errors.map(e => e.message).join(', '), 400);
      }
    }

    if (!res.headersSent) {
      throw new ApiError('Failed to compare models', 500);
    } else {
      // Stream is already started, send error event
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/playground/compare
 * Non-streaming comparison for simpler use cases
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { prompt, models, systemPrompt } = PlaygroundCompareSchema.parse(req.body);

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Get responses from all models in parallel
    const results = await Promise.all(
      models.map(async (model) => {
        const startTime = Date.now();

        try {
          let fullResponse = '';
          const stream = ollamaService.streamChat({
            model: model.name,
            messages,
            stream: true,
            options: model.parameters as ModelParameters,
          });

          for await (const chunk of stream) {
            fullResponse += chunk;
          }

          const totalTime = Date.now() - startTime;

          return {
            model: model.name,
            response: fullResponse,
            success: true,
            metrics: {
              totalTime,
              responseLength: fullResponse.length,
            },
          };
        } catch (error) {
          return {
            model: model.name,
            response: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    res.json({
      prompt,
      systemPrompt,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Playground compare error:', error);

    if (error instanceof z.ZodError) {
      throw new ApiError('Invalid request: ' + error.errors.map(e => e.message).join(', '), 400);
    }

    throw new ApiError('Failed to compare models', 500);
  }
});

export default router;
