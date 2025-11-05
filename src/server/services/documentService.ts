import mammoth from 'mammoth';
import { prisma } from '../db.js';
import { embeddingService } from './embeddingService.js';
import { vectorService } from './vectorService.js';
import { logger } from '../utils/logger.js';

/**
 * Document Service - Handles document parsing, processing, and storage
 *
 * Supports:
 * - PDF extraction (pdf-parse)
 * - Word documents (mammoth)
 * - Plain text files
 * - Markdown files
 */
class DocumentService {
  /**
   * Extract text from different file types
   */
  async extractText(buffer: Buffer, contentType: string, filename: string): Promise<string> {
    try {
      // PDF files
      if (contentType === 'application/pdf' || filename.endsWith('.pdf')) {
        // Use dynamic import for pdf-parse (CommonJS module in ESM context)
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return data.text;
      }

      // Word documents (.docx)
      if (
        contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filename.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }

      // Plain text, markdown, code files
      if (
        contentType.startsWith('text/') ||
        filename.match(/\.(txt|md|json|js|ts|py|java|cpp|c|h|css|html|xml|yaml|yml)$/i)
      ) {
        return buffer.toString('utf-8');
      }

      throw new Error(`Unsupported file type: ${contentType}`);
    } catch (error) {
      logger.error('Failed to extract text from document', { contentType, filename, error });
      throw error;
    }
  }

  /**
   * Process and store a document
   */
  async processDocument(
    collectionId: string,
    filename: string,
    contentType: string,
    buffer: Buffer
  ): Promise<string> {
    let documentId: string | null = null;

    try {
      // Get collection to check embedding model
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId }
      });

      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      // Extract text content
      logger.info('Extracting text from document', { filename, contentType });
      const content = await this.extractText(buffer, contentType, filename);

      if (!content || content.trim().length === 0) {
        throw new Error('No text content could be extracted from the document');
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          collectionId,
          filename,
          contentType,
          content,
          status: 'processing'
        }
      });
      documentId = document.id;

      logger.info('Document record created', { documentId, filename });

      // Check if ChromaDB is available
      if (!vectorService.isAvailable()) {
        throw new Error('ChromaDB is not available. Please ensure ChromaDB is running.');
      }

      // Process document: chunk and generate embeddings
      logger.info('Processing document for embeddings', { documentId });
      const { chunks, embeddings } = await embeddingService.processDocument(
        content,
        collection.embedding
      );

      // Store vectors in ChromaDB
      logger.info('Storing vectors in ChromaDB', { documentId, chunkCount: chunks.length });
      await vectorService.addDocumentChunks(
        collectionId,
        documentId,
        chunks,
        embeddings,
        chunks.map((chunk, index) => ({
          filename,
          contentType,
          chunkIndex: index,
          chunkLength: chunk.length
        }))
      );

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          chunkCount: chunks.length
        }
      });

      logger.info('Document processing completed', {
        documentId,
        filename,
        chunkCount: chunks.length
      });

      return documentId;
    } catch (error) {
      logger.error('Document processing failed', { filename, error });

      // Update document status to failed
      if (documentId) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      throw error;
    }
  }

  /**
   * Delete a document and its vectors
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Delete from ChromaDB if available
      if (vectorService.isAvailable()) {
        await vectorService.deleteDocumentChunks(document.collectionId, documentId);
      }

      // Delete from database
      await prisma.document.delete({
        where: { id: documentId }
      });

      logger.info('Document deleted', { documentId });
    } catch (error) {
      logger.error('Failed to delete document', { documentId, error });
      throw error;
    }
  }

  /**
   * Search for relevant document chunks using RAG
   */
  async searchDocuments(
    collectionId: string,
    query: string,
    topK: number = 5
  ): Promise<{
    documentId: string;
    filename: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }[]> {
    try {
      // Check if ChromaDB is available
      if (!vectorService.isAvailable()) {
        throw new Error('ChromaDB is not available');
      }

      // Get collection to check embedding model
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId }
      });

      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      // Generate embedding for query
      const queryEmbedding = await embeddingService.embedQuery(query, collection.embedding);

      // Search ChromaDB
      const { documents, distances, metadatas } = await vectorService.searchSimilar(
        collectionId,
        queryEmbedding,
        topK
      );

      // Transform results
      return documents.map((content, index) => ({
        documentId: metadatas[index]?.documentId || '',
        filename: metadatas[index]?.filename || 'Unknown',
        content,
        score: 1 - (distances[index] || 1), // Convert distance to similarity score
        metadata: metadatas[index]
      }));
    } catch (error) {
      logger.error('Failed to search documents', { collectionId, query, error });
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string) {
    return prisma.document.findUnique({
      where: { id: documentId },
      include: { collection: true }
    });
  }

  /**
   * List documents in a collection
   */
  async listDocuments(collectionId: string) {
    return prisma.document.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// Export singleton instance
export const documentService = new DocumentService();
