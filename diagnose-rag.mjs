import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function diagnoseRAG() {
  console.log('='.repeat(60));
  console.log('RAG DIAGNOSTIC TOOL');
  console.log('='.repeat(60));

  // 1. Check collections
  const collections = await prisma.collection.findMany();
  console.log('\n📦 COLLECTIONS:', collections.length);
  if (collections.length === 0) {
    console.log('   ❌ No collections found!');
    console.log('   → You need to create collections first in the RAG tab');
  } else {
    collections.forEach((col, i) => {
      console.log(`\n   [${i + 1}] ${col.name}`);
      console.log(`       ID: ${col.id}`);
      console.log(`       Embedding Model: ${col.embedding}`);
      console.log(`       Description: ${col.description || 'None'}`);
    });
  }

  // 2. Check documents
  const docs = await prisma.document.findMany({
    include: { collection: true }
  });
  console.log('\n\n📄 DOCUMENTS:', docs.length);
  if (docs.length === 0) {
    console.log('   ❌ No documents found!');
    console.log('   → You need to upload documents to your collections');
    console.log('   → Go to RAG tab → Select collection → Upload documents');
  } else {
    const completedDocs = docs.filter(d => d.status === 'completed');
    const failedDocs = docs.filter(d => d.status === 'failed');
    const processingDocs = docs.filter(d => d.status === 'processing');

    console.log(`   ✅ Completed: ${completedDocs.length}`);
    console.log(`   ❌ Failed: ${failedDocs.length}`);
    console.log(`   ⏳ Processing: ${processingDocs.length}`);

    docs.forEach((doc, i) => {
      const statusIcon = doc.status === 'completed' ? '✅' : doc.status === 'failed' ? '❌' : '⏳';
      console.log(`\n   ${statusIcon} [${i + 1}] ${doc.filename}`);
      console.log(`       Collection: ${doc.collection.name}`);
      console.log(`       Status: ${doc.status}`);
      console.log(`       Chunks: ${doc.chunkCount || 0}`);
      if (doc.errorMessage) {
        console.log(`       Error: ${doc.errorMessage}`);
      }
    });

    // Show failed documents in detail
    if (failedDocs.length > 0) {
      console.log('\n\n   ⚠️  FAILED DOCUMENTS DETAILS:');
      failedDocs.forEach((doc) => {
        console.log(`\n   ❌ ${doc.filename}`);
        console.log(`      Collection: ${doc.collection.name}`);
        console.log(`      Error: ${doc.errorMessage || 'Unknown error'}`);
        console.log(`      → Try re-uploading this document`);
      });
    }
  }

  // 3. Check vector-data directory
  const vectorDataPath = path.join(process.cwd(), 'vector-data');
  console.log('\n\n💾 VECTOR DATA DIRECTORY:', vectorDataPath);

  if (!fs.existsSync(vectorDataPath)) {
    console.log('   ❌ Directory does not exist!');
    console.log('   → It will be created automatically when you upload documents');
  } else {
    const files = fs.readdirSync(vectorDataPath);
    console.log(`   Files: ${files.length}`);

    if (files.length === 0) {
      console.log('   ❌ No vector index files found!');
      console.log('   → Documents need to be processed to create vector indexes');
    } else {
      const datFiles = files.filter(f => f.endsWith('.dat'));
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));
      const dataMetaFiles = files.filter(f => f.endsWith('_metadata.json'));

      console.log(`   📊 Index files (.dat): ${datFiles.length}`);
      console.log(`   📋 Meta files (.meta.json): ${metaFiles.length}`);
      console.log(`   📝 Data metadata files (_metadata.json): ${dataMetaFiles.length}`);

      // Check each collection's vector data
      for (const col of collections) {
        const hasIndex = datFiles.includes(`${col.id}.dat`);
        const hasMeta = metaFiles.includes(`${col.id}.meta.json`);
        const hasDataMeta = dataMetaFiles.includes(`${col.id}_metadata.json`);

        const allPresent = hasIndex && hasMeta && hasDataMeta;
        const icon = allPresent ? '✅' : '❌';

        console.log(`\n   ${icon} ${col.name} (${col.id})`);
        console.log(`       Index file (.dat): ${hasIndex ? 'Yes' : 'Missing'}`);
        console.log(`       Meta file (.meta.json): ${hasMeta ? 'Yes' : 'Missing'}`);
        console.log(`       Data metadata (_metadata.json): ${hasDataMeta ? 'Yes' : 'Missing'}`);

        if (!allPresent) {
          console.log(`       → Vector index is incomplete or missing`);
        } else {
          // Check metadata content
          try {
            const dataMetaPath = path.join(vectorDataPath, `${col.id}_metadata.json`);
            const metadata = JSON.parse(fs.readFileSync(dataMetaPath, 'utf-8'));
            const vectorCount = Object.keys(metadata).length;
            console.log(`       Vectors stored: ${vectorCount}`);
          } catch (err) {
            console.log(`       ⚠️  Could not read metadata: ${err.message}`);
          }
        }
      }
    }
  }

  // 4. Summary and recommendations
  console.log('\n\n' + '='.repeat(60));
  console.log('DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));

  if (collections.length === 0) {
    console.log('\n❌ PROBLEM: No collections found');
    console.log('   SOLUTION: Create a collection first:');
    console.log('   1. Go to the RAG tab in the UI');
    console.log('   2. Click "Create Collection"');
    console.log('   3. Choose an embedding model (recommended: nomic-embed-text)');
  } else if (docs.length === 0) {
    console.log('\n❌ PROBLEM: No documents uploaded');
    console.log('   SOLUTION: Upload documents to your collections:');
    console.log('   1. Go to the RAG tab');
    console.log('   2. Select a collection');
    console.log('   3. Click "Upload Documents"');
    console.log('   4. Upload PDF, DOCX, TXT, or other supported files');
  } else if (docs.filter(d => d.status === 'completed').length === 0) {
    console.log('\n❌ PROBLEM: No documents successfully processed');
    console.log('   SOLUTION: Check the failed documents above and:');
    console.log('   1. Make sure Ollama is running');
    console.log('   2. Make sure you have the embedding model pulled:');
    console.log('      Example: ollama pull nomic-embed-text');
    console.log('   3. Check the error messages for specific issues');
    console.log('   4. Try re-uploading the documents');
  } else {
    const vectorFiles = fs.existsSync(vectorDataPath) ? fs.readdirSync(vectorDataPath) : [];
    if (vectorFiles.length === 0) {
      console.log('\n❌ PROBLEM: Documents are marked as completed but no vector indexes exist');
      console.log('   SOLUTION: The vector indexes may have been deleted');
      console.log('   1. Delete the documents from the RAG tab');
      console.log('   2. Re-upload them to regenerate the vector indexes');
    } else {
      console.log('\n✅ RAG SYSTEM LOOKS HEALTHY!');
      console.log('   - Collections exist');
      console.log('   - Documents are processed');
      console.log('   - Vector indexes are present');
      console.log('\n   If RAG is still not working:');
      console.log('   1. Check the Logs tab to see what prompt was sent');
      console.log('   2. Look for "RAG Context Injected" section in logs');
      console.log('   3. Restart the dev server: npm run dev');
      console.log('   4. Make sure you select the collection when starting a chat');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Need help? Check the RAG documentation in CLAUDE.md');
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

diagnoseRAG().catch((error) => {
  console.error('\n❌ DIAGNOSTIC FAILED:', error);
  process.exit(1);
});
