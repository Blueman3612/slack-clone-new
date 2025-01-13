import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

export async function initPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY is not set in environment variables');
  }

  console.log('Initializing Pinecone...');
  console.log('API Key:', apiKey.slice(0, 5) + '...');  // Only show first 5 chars for security
  
  try {
    const pinecone = new Pinecone({
      apiKey,
      // Use the controller URL for your region
      controllerHostUrl: 'https://api.pinecone.io'
    });

    return pinecone;
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
} 