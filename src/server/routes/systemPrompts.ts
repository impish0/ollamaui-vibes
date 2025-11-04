import { Router } from 'express';
import { prisma } from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { createSystemPromptSchema, updateSystemPromptSchema, systemPromptIdParamSchema } from '../validation/schemas.js';
import type { CreateSystemPromptRequest, UpdateSystemPromptRequest } from '../../shared/types.js';

const router = Router();

// Get all system prompts
router.get('/', async (_req, res, next) => {
  try {
    const prompts = await prisma.systemPrompt.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(prompts);
  } catch (error) {
    next(error);
  }
});

// Get a single system prompt by ID
router.get('/:promptId', validateParams(systemPromptIdParamSchema), async (req, res, next) => {
  try {
    const { promptId } = req.params;

    const prompt = await prisma.systemPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw new ApiError('System prompt not found', 404);
    }

    res.json(prompt);
  } catch (error) {
    next(error);
  }
});

// Create a new system prompt
router.post('/', validateBody(createSystemPromptSchema), async (req, res, next) => {
  try {
    const { name, content }: CreateSystemPromptRequest = req.body;

    // Check for duplicate name
    const existing = await prisma.systemPrompt.findFirst({
      where: { name },
    });

    if (existing) {
      throw new ApiError('A system prompt with this name already exists', 409);
    }

    const prompt = await prisma.systemPrompt.create({
      data: { name, content },
    });

    res.status(201).json(prompt);
  } catch (error) {
    next(error);
  }
});

// Update a system prompt
router.patch('/:promptId', validateParams(systemPromptIdParamSchema), validateBody(updateSystemPromptSchema), async (req, res, next) => {
  try {
    const { promptId } = req.params;
    const { name, content }: UpdateSystemPromptRequest = req.body;

    // Check for duplicate name if updating name
    if (name) {
      const existing = await prisma.systemPrompt.findFirst({
        where: {
          name,
          NOT: { id: promptId }
        },
      });

      if (existing) {
        throw new ApiError('A system prompt with this name already exists', 409);
      }
    }

    const prompt = await prisma.systemPrompt.update({
      where: { id: promptId },
      data: {
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
      },
    });

    res.json(prompt);
  } catch (error) {
    next(error);
  }
});

// Delete a system prompt
router.delete('/:promptId', validateParams(systemPromptIdParamSchema), async (req, res, next) => {
  try {
    const { promptId } = req.params;

    await prisma.systemPrompt.delete({
      where: { id: promptId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
