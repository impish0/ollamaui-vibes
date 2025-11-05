import { ollamaService } from './ollamaService.js';
import { logger } from '../utils/logger.js';

/**
 * Embedding Service - Generates embeddings using Ollama
 *
 * Handles:
 * - Text chunking with overlap
 * - Embedding generation via Ollama API
 * - Batch processing for multiple chunks
 */
class EmbeddingService {
  private readonly DEFAULT_CHUNK_SIZE = 512;
  private readonly DEFAULT_CHUNK_OVERLAP = 50;
  private readonly DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

  /**
   * Split text into overlapping chunks
   */
  chunkText(
    text: string,
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    overlap: number = this.DEFAULT_CHUNK_OVERLAP
  ): string[] {
    const chunks: string[] = [];

    // Split by paragraphs first (better semantic boundaries)
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/);

      for (const word of words) {
        const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;

        if (testChunk.length > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());

          // Create overlap by keeping last N words
          const chunkWords = currentChunk.split(/\s+/);
          const overlapWords = chunkWords.slice(-overlap);
          currentChunk = overlapWords.join(' ') + ' ' + word;
        } else {
          currentChunk = testChunk;
        }
      }

      // Add paragraph break
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
    }

    // Add final chunk if exists
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Generate embedding for a single text using Ollama
   */
  async generateEmbedding(
    text: string,
    model: string = this.DEFAULT_EMBEDDING_MODEL
  ): Promise<number[]> {
    try {
      const baseUrl = ollamaService.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings API returned ${response.status}`);
      }

      const data = await response.json() as { embedding: number[] };
      return data.embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { model, error });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(
    texts: string[],
    model: string = this.DEFAULT_EMBEDDING_MODEL
  ): Promise<number[][]> {
    try {
      logger.info('Generating embeddings', { count: texts.length, model });

      const embeddings: number[][] = [];

      // Process in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
          batch.map(text => this.generateEmbedding(text, model))
        );
        embeddings.push(...batchEmbeddings);

        logger.info('Batch processed', {
          batch: Math.floor(i / batchSize) + 1,
          total: Math.ceil(texts.length / batchSize)
        });
      }

      return embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings batch', { error });
      throw error;
    }
  }

  /**
   * Process document text: chunk and generate embeddings
   */
  async processDocument(
    text: string,
    model: string = this.DEFAULT_EMBEDDING_MODEL,
    chunkSize?: number,
    overlap?: number
  ): Promise<{
    chunks: string[];
    embeddings: number[][];
  }> {
    try {
      // Chunk the text
      const chunks = this.chunkText(text, chunkSize, overlap);
      logger.info('Text chunked', { chunkCount: chunks.length });

      // Generate embeddings for all chunks
      const embeddings = await this.generateEmbeddings(chunks, model);

      return { chunks, embeddings };
    } catch (error) {
      logger.error('Failed to process document', { error });
      throw error;
    }
  }

  /**
   * Generate embedding for a query (uses same model as documents)
   */
  async embedQuery(
    query: string,
    model: string = this.DEFAULT_EMBEDDING_MODEL
  ): Promise<number[]> {
    return this.generateEmbedding(query, model);
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
