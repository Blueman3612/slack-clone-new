import { initPinecone } from '../lib/pinecone';

async function resetPineconeIndex() {
  try {
    console.log('Initializing Pinecone...');
    const pinecone = await initPinecone();
    
    // List existing indexes
    console.log('Checking existing indexes...');
    const indexes = await pinecone.listIndexes();
    console.log('Current indexes:', indexes);

    // Delete existing index if it exists
    if (indexes.indexes.find(idx => idx.name === 'blueman-chat')) {
      console.log('Deleting existing index...');
      await pinecone.deleteIndex('blueman-chat');
      // Wait for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Create new index with correct dimensions
    console.log('Creating new index...');
    await pinecone.createIndex({
      name: 'blueman-chat',
      dimension: 1536,  // Must match OpenAI's text-embedding-ada-002 dimensions
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'gcp',
          region: 'gcp-starter'
        }
      }
    });

    console.log('Successfully created index with correct dimensions!');
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPineconeIndex();