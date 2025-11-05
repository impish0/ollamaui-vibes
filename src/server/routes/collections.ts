import { Router } from 'express';
import { prisma } from '../db.js';
import { chromaService } from '../services/chromaService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { z } from 'zod';
import type { CreateCollectionRequest, UpdateCollectionRequest } from '../../shared/types.js';

const router = Router();

// Validation schemas
const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional(),
  embedding: z.string().max(100).optional()
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional()
});

const collectionIdParamSchema = z.object({
  collectionId: z.string().cuid('Invalid collection ID')
});

// Get all collections
router.get('/', async (_req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Just get first 5 documents for preview
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(collections);
  } catch (error) {
    next(error);
  }
});

// Get a single collection by ID
router.get('/:collectionId', validateParams(collectionIdParamSchema), async (req, res, next) => {
  try {
    const { collectionId } = req.params;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!collection) {
      throw new ApiError('Collection not found', 404);
    }

    res.json(collection);
  } catch (error) {
    next(error);
  }
});

// Create a new collection
router.post('/', validateBody(createCollectionSchema), async (req, res, next) => {
  try {
    const { name, description, embedding }: CreateCollectionRequest = req.body;

    // Check if ChromaDB is available
    if (!chromaService.isAvailable()) {
      throw new ApiError('ChromaDB is not available. Please ensure ChromaDB is running.', 503);
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        description,
        embedding: embedding || 'nomic-embed-text'
      }
    });

    // Initialize the collection in ChromaDB
    await chromaService.getOrCreateCollection(collection.id, collection.embedding);

    res.status(201).json(collection);
  } catch (error) {
    next(error);
  }
});

// Update a collection
router.patch('/:collectionId', validateParams(collectionIdParamSchema), validateBody(updateCollectionSchema), async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const { name, description }: UpdateCollectionRequest = req.body;

    const collection = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description })
      },
      include: {
        documents: true
      }
    });

    res.json(collection);
  } catch (error) {
    next(error);
  }
});

// Delete a collection
router.delete('/:collectionId', validateParams(collectionIdParamSchema), async (req, res, next) => {
  try {
    const { collectionId } = req.params;

    // Delete from ChromaDB if available
    if (chromaService.isAvailable()) {
      try {
        await chromaService.deleteCollection(collectionId);
      } catch (error) {
        // Log but don't fail if ChromaDB deletion fails
        console.error('Failed to delete ChromaDB collection:', error);
      }
    }

    // Delete from database (will cascade delete documents)
    await prisma.collection.delete({
      where: { id: collectionId }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get collection statistics
router.get('/:collectionId/stats', validateParams(collectionIdParamSchema), async (req, res, next) => {
  try {
    const { collectionId } = req.params;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        documents: {
          select: {
            status: true,
            chunkCount: true
          }
        }
      }
    });

    if (!collection) {
      throw new ApiError('Collection not found', 404);
    }

    const stats = {
      totalDocuments: collection.documents.length,
      completedDocuments: collection.documents.filter(d => d.status === 'completed').length,
      processingDocuments: collection.documents.filter(d => d.status === 'processing').length,
      failedDocuments: collection.documents.filter(d => d.status === 'failed').length,
      totalChunks: collection.documents.reduce((sum, d) => sum + d.chunkCount, 0)
    };

    // Get ChromaDB stats if available
    if (chromaService.isAvailable()) {
      try {
        const chromaStats = await chromaService.getCollectionStats(collectionId);
        res.json({ ...stats, vectorCount: chromaStats.count });
      } catch (error) {
        res.json({ ...stats, vectorCount: null });
      }
    } else {
      res.json({ ...stats, vectorCount: null });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
