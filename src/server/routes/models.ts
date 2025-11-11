import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ollamaService } from '../services/ollamaService.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const CreateModelSchema = z.object({
  name: z.string().min(1, 'Model name is required'),
  modelfile: z.string().min(1, 'Modelfile content is required'),
});

const ModelNameParamSchema = z.object({
  name: z.string().min(1, 'Model name is required'),
});

// GET /api/models - List all models (already available via ollama.ts, but included for completeness)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { models, lastFetch } = ollamaService.getCachedModels();
    res.json({
      models,
      lastFetch: new Date(lastFetch).toISOString(),
    });
  } catch (error) {
    console.error('Error getting models:', error);
    throw new ApiError('Failed to get models', 500);
  }
});

// GET /api/models/pull - Pull a model from Ollama library (GET for EventSource support)
router.get('/pull', async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) {
      throw new ApiError('Model name is required', 400);
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream progress updates
    await ollamaService.pullModel(name, (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });

    // Send completion
    res.write(`data: ${JSON.stringify({ status: 'success', message: 'Model pulled successfully' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error pulling model:', error);
    if (!res.headersSent) {
      throw new ApiError('Failed to pull model', 500);
    } else {
      res.write(`data: ${JSON.stringify({ status: 'error', message: 'Failed to pull model' })}\n\n`);
      res.end();
    }
  }
});

// DELETE /api/models/:name - Delete a model
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = ModelNameParamSchema.parse(req.params);
    await ollamaService.deleteModel(name);
    res.json({ success: true, message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', error);
    throw new ApiError('Failed to delete model', 500);
  }
});

// GET /api/models/:name/info - Get detailed info about a model
router.get('/:name/info', async (req: Request, res: Response) => {
  try {
    const { name } = ModelNameParamSchema.parse(req.params);
    const info = await ollamaService.getModelInfo(name);
    res.json(info);
  } catch (error) {
    console.error('Error getting model info:', error);
    throw new ApiError('Failed to get model info', 500);
  }
});

// POST /api/models/create - Create a custom model from Modelfile
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, modelfile } = CreateModelSchema.parse(req.body);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream progress updates
    await ollamaService.createModel(name, modelfile, (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });

    // Send completion
    res.write(`data: ${JSON.stringify({ status: 'success', message: 'Model created successfully' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error creating model:', error);
    if (!res.headersSent) {
      throw new ApiError('Failed to create model', 500);
    } else {
      res.write(`data: ${JSON.stringify({ status: 'error', message: 'Failed to create model' })}\n\n`);
      res.end();
    }
  }
});

export default router;
