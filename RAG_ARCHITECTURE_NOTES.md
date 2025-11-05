# RAG Architecture: Embedding Model Consistency

## The Problem

Different embedding models produce vectors with different dimensions:
- `nomic-embed-text` → 768 dimensions
- `mxbai-embed-large` → 1024 dimensions
- `qwen3-embedding:8b` → 4096 dimensions
- `text-embedding-3-small` (OpenAI) → 1536 dimensions

**Critical Constraint**: A vector index can only store ONE dimension size. You cannot search 4096-dimensional query vectors against a 768-dimensional index.

## Current Architecture

### Per-Collection Embedding Model
Each collection specifies ONE embedding model at creation:
```typescript
Collection {
  id: string
  name: string
  embedding: string  // e.g., "qwen3-embedding:8b"
}
```

When documents are uploaded:
1. Text is chunked into 512-char pieces
2. Each chunk is embedded using the **collection's embedding model**
3. Vectors are stored in `vector-data/{collectionId}.dat`

When searching:
1. Query text is embedded using the **collection's embedding model**
2. Search is performed against vectors in that collection

### The Risk

If a user:
1. Creates collection with `nomic-embed-text` (768-dim)
2. Uploads documents (vectors stored as 768-dim)
3. Pulls `qwen3-embedding:8b` and changes collection embedding
4. Tries to search (generates 4096-dim query)
5. **Search fails silently** - dimension mismatch returns 0 results

## Solutions to Implement

### 1. **Dimension Detection & Validation** (CRITICAL)

Add dimension metadata to collections:
```typescript
Collection {
  id: string
  name: string
  embedding: string
  embeddingDimension: number | null  // Detected after first document
  documentCount: number
}
```

When adding documents:
```typescript
// First document sets the dimension
if (collection.embeddingDimension === null) {
  collection.embeddingDimension = embeddings[0].length;
}

// Validate all subsequent embeddings
if (embeddings[0].length !== collection.embeddingDimension) {
  throw new Error(
    `Dimension mismatch! Collection expects ${collection.embeddingDimension} ` +
    `but model produced ${embeddings[0].length}. ` +
    `This usually means the embedding model changed. ` +
    `Please rebuild the collection.`
  );
}
```

When searching:
```typescript
const queryEmbedding = await embedQuery(query, collection.embedding);

if (collection.embeddingDimension && queryEmbedding.length !== collection.embeddingDimension) {
  throw new Error(
    `Cannot search: Query embedding dimension (${queryEmbedding.length}) ` +
    `doesn't match collection (${collection.embeddingDimension}). ` +
    `The embedding model may have changed. Rebuild this collection.`
  );
}
```

### 2. **Embedding Model Registry** (HIGH PRIORITY)

Create a model metadata service:
```typescript
// src/server/services/embeddingModelRegistry.ts
export const EMBEDDING_MODELS = {
  'nomic-embed-text': {
    dimension: 768,
    maxTokens: 8192,
    description: 'Fast, efficient embedding model',
    recommended: true
  },
  'mxbai-embed-large': {
    dimension: 1024,
    maxTokens: 512,
    description: 'Balanced performance'
  },
  'qwen3-embedding:8b': {
    dimension: 4096,
    maxTokens: 8192,
    description: 'High-quality embeddings, slower',
    recommended: true
  }
};

export async function detectEmbeddingDimension(model: string): Promise<number> {
  // Test with a dummy query to detect dimension
  const testEmbedding = await embedQuery('test', model);
  return testEmbedding.length;
}
```

### 3. **UI Warnings & Guardrails**

#### Collection Creation Screen:
```
┌─────────────────────────────────────────┐
│ Create Collection                       │
├─────────────────────────────────────────┤
│ Name: [My Documents____________]        │
│                                         │
│ Embedding Model:                        │
│ ┌─────────────────────────────────┐     │
│ │ ○ nomic-embed-text              │     │
│ │   768 dimensions · 8K tokens    │     │
│ │   ✓ Recommended                 │     │
│ │                                 │     │
│ │ ○ qwen3-embedding:8b            │     │
│ │   4096 dimensions · 8K tokens   │     │
│ │   ✓ Recommended (higher quality)│     │
│ └─────────────────────────────────┘     │
│                                         │
│ ⚠️  IMPORTANT:                          │
│ The embedding model CANNOT be changed   │
│ after uploading documents. To use a     │
│ different model, you must create a new  │
│ collection.                             │
└─────────────────────────────────────────┘
```

#### Collection Settings (after documents exist):
```
┌─────────────────────────────────────────┐
│ Collection Settings                     │
├─────────────────────────────────────────┤
│ Name: My Documents                      │
│                                         │
│ Embedding Model: qwen3-embedding:8b     │
│ Dimension: 4096                         │
│ Documents: 13 (1,481 vectors)           │
│                                         │
│ [ Change Embedding Model ]              │
│   ⚠️  This will DELETE all documents    │
│       and rebuild the collection        │
└─────────────────────────────────────────┘
```

### 4. **Graceful Degradation**

When dimension mismatch detected:
```typescript
try {
  const results = await searchDocuments(collectionId, query, 5);
} catch (error) {
  if (error.message.includes('dimension')) {
    logger.warn('Dimension mismatch in collection', {
      collectionId,
      error: error.message
    });

    // Return empty results with user-friendly error
    return {
      results: [],
      error: 'This collection needs to be rebuilt. The embedding model has changed.',
      suggestedAction: 'Delete and re-upload documents'
    };
  }
  throw error;
}
```

### 5. **Migration/Rebuild Tools**

Add endpoint to rebuild collection with new model:
```typescript
// POST /api/collections/:id/rebuild
async rebuildCollection(collectionId: string, newEmbeddingModel: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { documents: true }
  });

  // Store original documents
  const documentContents = collection.documents.map(doc => ({
    filename: doc.filename,
    content: doc.content,
    contentType: doc.contentType
  }));

  // Delete all vectors and documents
  await vectorService.deleteCollection(collectionId);
  await prisma.document.deleteMany({ where: { collectionId } });

  // Update embedding model
  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      embedding: newEmbeddingModel,
      embeddingDimension: null  // Will be detected on first document
    }
  });

  // Re-process all documents
  for (const doc of documentContents) {
    await documentService.processDocument(
      collectionId,
      doc.filename,
      doc.contentType,
      Buffer.from(doc.content)
    );
  }
}
```

## Best Practices for AI Playground

### ✅ DO:
1. **Show embedding model metadata in UI** (dimension, max tokens)
2. **Validate dimensions at upload and search time**
3. **Provide clear error messages** when mismatches occur
4. **Allow easy rebuild/migration** for testing different models
5. **Log dimension info** in prompt logs for debugging
6. **Auto-detect dimension** on first document upload

### ❌ DON'T:
1. Allow changing embedding model without warning
2. Fail silently on dimension mismatch
3. Hide dimension information from users
4. Make it hard to rebuild collections for testing

## Testing Different Models (Recommended Workflow)

For users who want to test multiple embedding models:

### Option A: Multiple Collections
```
Collection: "Docs - Nomic" (nomic-embed-text, 768-dim)
Collection: "Docs - Qwen" (qwen3-embedding:8b, 4096-dim)
Collection: "Docs - MXBAI" (mxbai-embed-large, 1024-dim)
```
Upload same documents to each, compare search quality.

### Option B: Easy Rebuild
```
1. Upload docs to collection with Model A
2. Test search quality
3. Click "Rebuild with Different Model"
4. Select Model B
5. System re-processes all documents
6. Test again
```

## Implementation Priority

1. **Phase 1 (CRITICAL)**: Add dimension validation to prevent silent failures
2. **Phase 2 (HIGH)**: Add embedding model registry with metadata
3. **Phase 3 (MEDIUM)**: UI warnings and dimension display
4. **Phase 4 (NICE-TO-HAVE)**: One-click rebuild tools

## Migration Path for Existing Collections

Users with existing collections that have dimension mismatches:

```bash
# 1. Check current dimensions
node check-vector-dimensions.mjs

# 2. If mismatch detected, rebuild:
# Option A: Delete documents in UI and re-upload
# Option B: Use rebuild endpoint (once implemented)
# Option C: Delete collection and recreate with correct model
```

## Technical Notes

- **hnswlib-node** requires dimension to be specified at index creation
- Dimension cannot be changed after index is created
- To change dimension = delete index and recreate
- Each collection gets its own index file with fixed dimension
- Query embedding dimension must match index dimension exactly
