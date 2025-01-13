import { initPinecone } from '../lib/pinecone';

async function listIndexes() {
  try {
    const pinecone = await initPinecone();
    const indexes = await pinecone.listIndexes();
    
    console.log('Available Pinecone indexes:');
    console.log(indexes);
  } catch (error) {
    console.error('Error listing indexes:', error);
  }
}

listIndexes(); 