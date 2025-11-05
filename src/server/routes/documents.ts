import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { documentService } from '../services/documentService.js';
import { chromaService } from '../services/chromaService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { validateParams, validateQuery } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html',
      'application/json',
      'text/csv'
    ];

    const allowedExtensions = [
      '.pdf', '.txt', '.md', '.docx', '.html', '.json', '.csv',
      '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.css', '.xml', '.yaml', '.yml'
    ];

    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const isAllowed = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported types: PDF, TXT, MD, DOCX, HTML, JSON, CSV, and common code files.'));
    }
  }
});

// Validation schemas
const documentIdParamSchema = z.object({
  documentId: z.string().cuid('Invalid document ID')
});

const collectionIdQuerySchema = z.object({
  collectionId: z.string().cuid('Invalid collection ID')
});

const searchQuerySchema = z.object({
  collectionId: z.string().cuid('Invalid collection ID'),
  query: z.string().min(1, 'Query is required'),
  topK: z.coerce.number().int().min(1).max(20).optional()
});

// Upload document to a collection
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400);
    }

    const { collectionId } = req.body;

    if (!collectionId) {
      throw new ApiError('Collection ID is required', 400);
    }

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    });

    if (!collection) {
      throw new ApiError('Collection not found', 404);
    }

    // Check if ChromaDB is available
    if (!chromaService.isAvailable()) {
      throw new ApiError('ChromaDB is not available. Please ensure ChromaDB is running.', 503);
    }

    // Process document asynchronously
    const documentId = await documentService.processDocument(
      collectionId,
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer
    );

    // Fetch the created document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { collection: true }
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

// Get documents for a collection
router.get('/', validateQuery(collectionIdQuerySchema), async (req, res, next) => {
  try {
    const { collectionId } = req.query as { collectionId: string };

    const documents = await documentService.listDocuments(collectionId);
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// Get a single document
router.get('/:documentId', validateParams(documentIdParamSchema), async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await documentService.getDocument(documentId);

    if (!document) {
      throw new ApiError('Document not found', 404);
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
});

// Delete a document
router.delete('/:documentId', validateParams(documentIdParamSchema), async (req, res, next) => {
  try {
    const { documentId } = req.params;

    await documentService.deleteDocument(documentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Search documents (RAG search)
router.get('/search', validateQuery(searchQuerySchema), async (req, res, next) => {
  try {
    const { collectionId, query, topK } = req.query as {
      collectionId: string;
      query: string;
      topK?: string;
    };

    if (!chromaService.isAvailable()) {
      throw new ApiError('ChromaDB is not available', 503);
    }

    const results = await documentService.searchDocuments(
      collectionId,
      query,
      topK ? parseInt(topK) : 5
    );

    res.json({
      query,
      results,
      count: results.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
