import { Router } from 'express';
import { prisma } from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
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
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const prompt = await prisma.systemPrompt.findUnique({
      where: { id },
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
router.post('/', async (req, res, next) => {
  try {
    const { name, content }: CreateSystemPromptRequest = req.body;

    if (!name || !content) {
      throw new ApiError('Name and content are required', 400);
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
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, content }: UpdateSystemPromptRequest = req.body;

    const prompt = await prisma.systemPrompt.update({
      where: { id },
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
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.systemPrompt.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
