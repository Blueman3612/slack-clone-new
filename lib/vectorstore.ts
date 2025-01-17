import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { env } from './env';

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY!
});

export async function initVectorStore() {
  try {
    console.log('Initializing Pinecone index:', env.PINECONE_INDEX);
    const index = pinecone.Index(env.PINECONE_INDEX!);
    
    console.log('Creating vector store with OpenAI embeddings');
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({
        openAIApiKey: env.OPENAI_API_KEY!
      }),
      { 
        pineconeIndex: index
      }
    );
    
    console.log('Vector store initialized successfully');
    return vectorStore;
  } catch (error) {
    console.error('Error initializing vector store:', error);
    throw error;
  }
} 