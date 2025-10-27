import { Router } from 'express';
import { prisma } from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { CreateChatRequest, UpdateChatRequest } from '../../shared/types.js';

const router = Router();

// Get all chats
router.get('/', async (_req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      include: {
        systemPrompt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Just get the first message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(chats);
  } catch (error) {
    next(error);
  }
});

// Get a single chat by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        systemPrompt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      throw new ApiError('Chat not found', 404);
    }

    res.json(chat);
  } catch (error) {
    next(error);
  }
});

// Create a new chat
router.post('/', async (req, res, next) => {
  try {
    const { model, systemPromptId }: CreateChatRequest = req.body;

    if (!model) {
      throw new ApiError('Model is required', 400);
    }

    const chat = await prisma.chat.create({
      data: {
        model,
        systemPromptId,
      },
      include: {
        systemPrompt: true,
        messages: true,
      },
    });

    res.status(201).json(chat);
  } catch (error) {
    next(error);
  }
});

// Update a chat
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, model, systemPromptId }: UpdateChatRequest = req.body;

    const chat = await prisma.chat.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(model !== undefined && { model }),
        ...(systemPromptId !== undefined && { systemPromptId }),
      },
      include: {
        systemPrompt: true,
        messages: true,
      },
    });

    res.json(chat);
  } catch (error) {
    next(error);
  }
});

// Delete a chat
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.chat.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
