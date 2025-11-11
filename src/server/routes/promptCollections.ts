import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { PromptService } from '../services/promptService.js';

const router = Router();

// Validation Schemas
const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

const CollectionIdSchema = z.object({
  id: z.string().cuid(),
});

/**
 * GET /api/prompt-collections
 * List all prompt collections with optional prompt counts
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await prisma.promptCollection.findMany({
      include: {
        prompts: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include prompt count
    const collectionsWithCount = collections.map((collection) => ({
      ...collection,
      promptCount: collection.prompts.length,
      prompts: undefined, // Remove prompts array, keep only count
    }));

    res.json(collectionsWithCount);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompt-collections/:id
 * Get a specific collection with all its prompts
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = CollectionIdSchema.parse(req.params);

    const collection = await prisma.promptCollection.findUnique({
      where: { id },
      include: {
        prompts: {
          include: {
            currentVersion: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(collection);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompt-collections
 * Create a new prompt collection
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateCollectionSchema.parse(req.body);

    // Validate name
    if (!PromptService.validateCollectionName(data.name)) {
      return res.status(400).json({
        error: 'Invalid collection name. Use only alphanumeric characters, spaces, hyphens, and underscores.',
      });
    }

    // Check for duplicate name
    const existing = await prisma.promptCollection.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return res.status(409).json({
        error: 'A collection with this name already exists',
      });
    }

    const collection = await prisma.promptCollection.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
      },
    });

    res.status(201).json(collection);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/prompt-collections/:id
 * Update a prompt collection
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = CollectionIdSchema.parse(req.params);
    const data = UpdateCollectionSchema.parse(req.body);

    // If updating name, validate and check for duplicates
    if (data.name) {
      if (!PromptService.validateCollectionName(data.name)) {
        return res.status(400).json({
          error: 'Invalid collection name. Use only alphanumeric characters, spaces, hyphens, and underscores.',
        });
      }

      const existing = await prisma.promptCollection.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(409).json({
          error: 'A collection with this name already exists',
        });
      }
    }

    const collection = await prisma.promptCollection.update({
      where: { id },
      data,
    });

    res.json(collection);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Collection not found' });
    }
    next(error);
  }
});

/**
 * DELETE /api/prompt-collections/:id
 * Delete a prompt collection
 * Note: Prompts in the collection will have their collectionId set to null
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = CollectionIdSchema.parse(req.params);

    await prisma.promptCollection.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Collection not found' });
    }
    next(error);
  }
});

export default router;
