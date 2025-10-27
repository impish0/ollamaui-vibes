import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.js';
import type { CreateMessageRequest } from '../../shared/types.js';

const router = Router();
const prisma = new PrismaClient();

// Get all messages for a chat
router.get('/chat/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// Create a new message
router.post('/', async (req, res, next) => {
  try {
    const { chatId, role, content, model }: CreateMessageRequest = req.body;

    if (!chatId || !role || !content) {
      throw new ApiError('chatId, role, and content are required', 400);
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      throw new ApiError('Invalid role. Must be user, assistant, or system', 400);
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        role,
        content,
        model,
      },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Delete a message
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.message.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
