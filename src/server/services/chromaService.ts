import { ChromaClient } from 'chromadb';
import { logger } from '../utils/logger.js';

/**
 * ChromaDB Service - Manages vector storage and retrieval for RAG
 *
 * Singleton service that handles:
 * - Collection management in ChromaDB
 * - Vector embedding storage
 * - Similarity search for document retrieval
 */
class ChromaService {
  private client: ChromaClient;
  private isInitialized = false;

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
  }

  /**
   * Initialize ChromaDB connection
   */
  async initialize(): Promise<void> {
    try {
      // Test connection by getting heartbeat
      await this.client.heartbeat();
      this.isInitialized = true;
      logger.info('ChromaDB service initialized successfully');
    } catch (error) {
      logger.warn('ChromaDB not available - RAG features will be disabled', { error });
      this.isInitialized = false;
    }
  }

  /**
   * Check if ChromaDB is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Get or create a collection in ChromaDB
   */
  async getOrCreateCollection(collectionId: string, embeddingModel: string = 'nomic-embed-text') {
    try {
      return await this.client.getOrCreateCollection({
        name: `collection_${collectionId}`,
        metadata: {
          embeddingModel,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get or create ChromaDB collection', { collectionId, error });
      throw error;
    }
  }

  /**
   * Delete a collection from ChromaDB
   */
  async deleteCollection(collectionId: string): Promise<void> {
    try {
      await this.client.deleteCollection({
        name: `collection_${collectionId}`
      });
      logger.info('ChromaDB collection deleted', { collectionId });
    } catch (error) {
      logger.error('Failed to delete ChromaDB collection', { collectionId, error });
      throw error;
    }
  }

  /**
   * Add document chunks to a collection
   */
  async addDocumentChunks(
    collectionId: string,
    documentId: string,
    chunks: string[],
    embeddings: number[][],
    metadata?: Record<string, any>[]
  ): Promise<void> {
    try {
      const collection = await this.getOrCreateCollection(collectionId);

      // Generate IDs for each chunk
      const ids = chunks.map((_, index) => `${documentId}_chunk_${index}`);

      // Prepare metadata for each chunk
      const chunkMetadata = chunks.map((_chunk, index) => ({
        documentId,
        chunkIndex: index,
        chunkCount: chunks.length,
        ...(metadata && metadata[index] ? metadata[index] : {})
      }));

      await collection.add({
        ids,
        embeddings,
        documents: chunks,
        metadatas: chunkMetadata
      });

      logger.info('Document chunks added to ChromaDB', {
        collectionId,
        documentId,
        chunkCount: chunks.length
      });
    } catch (error) {
      logger.error('Failed to add document chunks to ChromaDB', {
        collectionId,
        documentId,
        error
      });
      throw error;
    }
  }

  /**
   * Search for relevant document chunks
   */
  async searchSimilar(
    collectionId: string,
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<{
    documents: string[];
    distances: number[];
    metadatas: Record<string, any>[];
  }> {
    try {
      const collection = await this.getOrCreateCollection(collectionId);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK
      });

      return {
        documents: (results.documents[0] || []).filter((d): d is string => d !== null),
        distances: (results.distances?.[0] || []).filter((d): d is number => d !== null),
        metadatas: (results.metadatas?.[0] || []).filter((m): m is Record<string, any> => m !== null)
      };
    } catch (error) {
      logger.error('Failed to search ChromaDB', { collectionId, error });
      throw error;
    }
  }

  /**
   * Delete all chunks for a specific document
   */
  async deleteDocumentChunks(collectionId: string, documentId: string): Promise<void> {
    try {
      const collection = await this.getOrCreateCollection(collectionId);

      // Query to find all chunk IDs for this document
      const results = await collection.get({
        where: { documentId }
      });

      if (results.ids.length > 0) {
        await collection.delete({
          ids: results.ids
        });

        logger.info('Document chunks deleted from ChromaDB', {
          collectionId,
          documentId,
          chunkCount: results.ids.length
        });
      }
    } catch (error) {
      logger.error('Failed to delete document chunks from ChromaDB', {
        collectionId,
        documentId,
        error
      });
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionId: string): Promise<{ count: number }> {
    try {
      const collection = await this.getOrCreateCollection(collectionId);
      const count = await collection.count();
      return { count };
    } catch (error) {
      logger.error('Failed to get collection stats', { collectionId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const chromaService = new ChromaService();
