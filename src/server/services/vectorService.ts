import * as hnswlib from 'hnswlib-node';
const { HierarchicalNSW } = hnswlib;
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

/**
 * Vector Service - Manages vector storage and retrieval for RAG
 *
 * Uses hnswlib-node for fast approximate nearest neighbor search
 * - Pure JavaScript/C++ (no server required!)
 * - Stores indexes as local files in ./vector-data/
 * - Fast similarity search with HNSW algorithm
 */
class VectorService {
  private indexes: Map<string, HierarchicalNSW> = new Map();
  private indexMetadata: Map<string, { dimension: number; maxElements: number }> = new Map();
  private vectorDataPath: string;
  private isInitialized = false;

  constructor() {
    this.vectorDataPath = process.env.VECTOR_DATA_PATH || path.join(process.cwd(), 'vector-data');
  }

  /**
   * Initialize vector service
   */
  async initialize(): Promise<void> {
    try {
      // Ensure vector data directory exists
      if (!fs.existsSync(this.vectorDataPath)) {
        fs.mkdirSync(this.vectorDataPath, { recursive: true });
      }

      // Load existing indexes
      await this.loadExistingIndexes();

      this.isInitialized = true;
      logger.info('Vector service initialized successfully (hnswlib-node)', {
        path: this.vectorDataPath
      });
    } catch (error) {
      logger.error('Vector service initialization failed', { error });
      this.isInitialized = false;
    }
  }

  /**
   * Load existing indexes from disk
   */
  private async loadExistingIndexes(): Promise<void> {
    try {
      const files = fs.readdirSync(this.vectorDataPath);
      for (const file of files) {
        if (file.endsWith('.dat')) {
          const collectionId = file.replace('.dat', '');
          const metadataPath = path.join(this.vectorDataPath, `${collectionId}.meta.json`);

          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            const index = new HierarchicalNSW('cosine', metadata.dimension);
            await index.readIndex(path.join(this.vectorDataPath, file), metadata.maxElements);
            this.indexes.set(collectionId, index);
            this.indexMetadata.set(collectionId, metadata);
            logger.info('Loaded existing index', { collectionId, dimension: metadata.dimension });
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load some indexes', { error });
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Ensure collection is ready (public method for API compatibility)
   */
  async getOrCreateCollection(collectionId: string, _embeddingModel?: string): Promise<void> {
    // This is a no-op - indexes are created automatically on first use
    // Keeping method for API compatibility with old chromaService
    logger.info('Collection will be created on first document add', { collectionId });
  }

  /**
   * Get or create an index for a collection (private)
   */
  private getOrCreateIndex(collectionId: string, dimension: number = 768): HierarchicalNSW {
    let index = this.indexes.get(collectionId);

    if (!index) {
      // Create new index with HNSW parameters
      index = new HierarchicalNSW('cosine', dimension);
      index.initIndex(10000, 16, 200, 100); // maxElements, M, efConstruction, randomSeed

      this.indexes.set(collectionId, index);
      this.indexMetadata.set(collectionId, { dimension, maxElements: 10000 });

      logger.info('Created new index', { collectionId, dimension });
    }

    return index;
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
      if (embeddings.length === 0) {
        throw new Error('No embeddings provided');
      }

      const dimension = embeddings[0].length;
      const index = this.getOrCreateIndex(collectionId, dimension);

      // Add each embedding to the index
      for (let i = 0; i < embeddings.length; i++) {
        const chunkId = `${documentId}_chunk_${i}`;
        const label = index.getCurrentCount();

        // Store vector
        index.addPoint(embeddings[i], label);

        // Store metadata separately (hnswlib doesn't store metadata)
        const metadataPath = path.join(this.vectorDataPath, `${collectionId}_metadata.json`);
        const allMetadata = this.loadMetadata(collectionId);
        allMetadata[label] = {
          chunkId,
          documentId,
          chunkIndex: i,
          content: chunks[i],
          ...(metadata && metadata[i] ? metadata[i] : {})
        };
        fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2));
      }

      // Save index to disk
      await this.saveIndex(collectionId);

      logger.info('Document chunks added to vector index', {
        collectionId,
        documentId,
        chunkCount: chunks.length
      });
    } catch (error) {
      logger.error('Failed to add document chunks', { collectionId, documentId, error });
      throw error;
    }
  }

  /**
   * Search for similar vectors
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
      const index = this.indexes.get(collectionId);

      if (!index || index.getCurrentCount() === 0) {
        return { documents: [], distances: [], metadatas: [] };
      }

      // Search for nearest neighbors
      const result = index.searchKnn(queryEmbedding, topK);
      const allMetadata = this.loadMetadata(collectionId);

      const documents: string[] = [];
      const distances: number[] = [];
      const metadatas: Record<string, any>[] = [];

      for (let i = 0; i < result.neighbors.length; i++) {
        const label = result.neighbors[i];
        const distance = result.distances[i];
        const meta = allMetadata[label];

        if (meta) {
          documents.push(meta.content || '');
          distances.push(distance);
          metadatas.push(meta);
        }
      }

      return { documents, distances, metadatas };
    } catch (error) {
      logger.error('Failed to search vectors', { collectionId, error });
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionId: string): Promise<void> {
    try {
      this.indexes.delete(collectionId);
      this.indexMetadata.delete(collectionId);

      // Delete index files
      const indexPath = path.join(this.vectorDataPath, `${collectionId}.dat`);
      const metaPath = path.join(this.vectorDataPath, `${collectionId}.meta.json`);
      const dataMetaPath = path.join(this.vectorDataPath, `${collectionId}_metadata.json`);

      [indexPath, metaPath, dataMetaPath].forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      logger.info('Collection deleted', { collectionId });
    } catch (error) {
      logger.error('Failed to delete collection', { collectionId, error });
      throw error;
    }
  }

  /**
   * Delete document chunks
   */
  async deleteDocumentChunks(collectionId: string, documentId: string): Promise<void> {
    try {
      // Load metadata, filter out document chunks, save back
      const allMetadata = this.loadMetadata(collectionId);
      const filtered = Object.fromEntries(
        Object.entries(allMetadata).filter(([_, meta]) => meta.documentId !== documentId)
      );

      const metadataPath = path.join(this.vectorDataPath, `${collectionId}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(filtered, null, 2));

      // Note: hnswlib doesn't support deletion, so vectors remain but metadata is gone
      // For production, consider rebuilding index periodically

      logger.info('Document chunks marked as deleted', { collectionId, documentId });
    } catch (error) {
      logger.error('Failed to delete document chunks', { collectionId, documentId, error });
      throw error;
    }
  }

  /**
   * Get collection stats
   */
  async getCollectionStats(collectionId: string): Promise<{ count: number }> {
    try {
      const index = this.indexes.get(collectionId);
      return { count: index ? index.getCurrentCount() : 0 };
    } catch (error) {
      logger.error('Failed to get collection stats', { collectionId, error });
      return { count: 0 };
    }
  }

  /**
   * Save index to disk
   */
  private async saveIndex(collectionId: string): Promise<void> {
    const index = this.indexes.get(collectionId);
    const metadata = this.indexMetadata.get(collectionId);

    if (index && metadata) {
      const indexPath = path.join(this.vectorDataPath, `${collectionId}.dat`);
      const metaPath = path.join(this.vectorDataPath, `${collectionId}.meta.json`);

      await index.writeIndex(indexPath);
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    }
  }

  /**
   * Load metadata for a collection
   */
  private loadMetadata(collectionId: string): Record<number, any> {
    const metadataPath = path.join(this.vectorDataPath, `${collectionId}_metadata.json`);
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }
    return {};
  }
}

// Export singleton instance
export const vectorService = new VectorService();
