import fs from 'fs';
import path from 'path';

const vectorDataPath = path.join(process.cwd(), 'vector-data');

console.log('='.repeat(60));
console.log('VECTOR DIMENSION CHECKER');
console.log('='.repeat(60));

if (!fs.existsSync(vectorDataPath)) {
  console.log('\n❌ vector-data directory does not exist');
  process.exit(1);
}

const files = fs.readdirSync(vectorDataPath);
const metaFiles = files.filter(f => f.endsWith('.meta.json'));

console.log(`\nFound ${metaFiles.length} vector index metadata files\n`);

for (const metaFile of metaFiles) {
  const metaPath = path.join(vectorDataPath, metaFile);
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const collectionId = metaFile.replace('.meta.json', '');

  console.log(`Collection: ${collectionId}`);
  console.log(`  Stored dimension: ${metadata.dimension}`);
  console.log(`  Max elements: ${metadata.maxElements}`);

  // Check data metadata to see how many vectors
  const dataMetaPath = path.join(vectorDataPath, `${collectionId}_metadata.json`);
  if (fs.existsSync(dataMetaPath)) {
    const dataMetadata = JSON.parse(fs.readFileSync(dataMetaPath, 'utf-8'));
    const vectorCount = Object.keys(dataMetadata).length;
    console.log(`  Vectors stored: ${vectorCount}`);
  }
  console.log();
}

console.log('\n' + '='.repeat(60));
console.log('NOTES:');
console.log('='.repeat(60));
console.log('Current qwen3-embedding:8b produces 4096-dimensional vectors.');
console.log('If your stored vectors have a different dimension, you need to');
console.log('rebuild them by:');
console.log('  1. Delete all documents from the RAG UI');
console.log('  2. Re-upload the documents');
console.log('  3. They will be re-embedded with the correct dimensions');
console.log('='.repeat(60) + '\n');
