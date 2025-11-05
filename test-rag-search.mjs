import { PrismaClient } from '@prisma/client';
import { embeddingService } from './src/server/services/embeddingService.js';
import { vectorService } from './src/server/services/vectorService.js';

const prisma = new PrismaClient();

async function testRAGSearch() {
  console.log('='.repeat(60));
  console.log('RAG SEARCH TEST');
  console.log('='.repeat(60));

  // Initialize vector service
  console.log('\n1. Initializing vector service...');
  await vectorService.initialize();
  console.log('   ✅ Vector service initialized');

  // Get collections
  const collections = await prisma.collection.findMany();
  console.log(`\n2. Found ${collections.length} collections`);

  for (const collection of collections) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing Collection: ${collection.name}`);
    console.log(`Collection ID: ${collection.id}`);
    console.log(`Embedding Model: ${collection.embedding}`);
    console.log('='.repeat(60));

    // Test query
    const testQuery = 'What can you tell me about myself?';
    console.log(`\nTest Query: "${testQuery}"`);

    try {
      // Step 1: Generate embedding for query
      console.log('\n3. Generating query embedding...');
      const queryEmbedding = await embeddingService.embedQuery(testQuery, collection.embedding);
      console.log(`   ✅ Query embedding generated`);
      console.log(`   Embedding dimension: ${queryEmbedding.length}`);
      console.log(`   First 5 values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

      // Step 2: Search for similar vectors
      console.log('\n4. Searching for similar vectors...');
      const { documents, distances, metadatas } = await vectorService.searchSimilar(
        collection.id,
        queryEmbedding,
        5
      );

      console.log(`   ✅ Search completed`);
      console.log(`   Results found: ${documents.length}`);

      if (documents.length === 0) {
        console.log('\n   ⚠️  NO RESULTS FOUND!');
        console.log('   Possible reasons:');
        console.log('   - Vector index is empty (but diagnostic showed vectors exist)');
        console.log('   - Embedding dimension mismatch');
        console.log('   - Vector index is corrupted');
      } else {
        console.log('\n5. Search Results:');
        documents.forEach((content, index) => {
          const score = 1 - (distances[index] || 1);
          const meta = metadatas[index];
          console.log(`\n   Result ${index + 1}:`);
          console.log(`   Score: ${score.toFixed(4)}`);
          console.log(`   Distance: ${distances[index].toFixed(4)}`);
          console.log(`   Filename: ${meta?.filename || 'Unknown'}`);
          console.log(`   Document ID: ${meta?.documentId || 'Unknown'}`);
          console.log(`   Chunk Index: ${meta?.chunkIndex || 0}`);
          console.log(`   Content Preview: ${content.substring(0, 150).replace(/\n/g, ' ')}...`);
        });
      }
    } catch (error) {
      console.log(`\n   ❌ ERROR: ${error.message}`);
      console.log(`   Stack trace:`);
      console.log(error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

testRAGSearch().catch((error) => {
  console.error('\n❌ TEST FAILED:', error);
  process.exit(1);
});
