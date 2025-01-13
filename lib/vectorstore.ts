import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  controllerHostUrl: 'https://api.pinecone.io'
});

export async function initVectorStore() {
  const index = pinecone.Index('blueman-chat');
  
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { 
      pineconeIndex: index,
      namespace: 'discord-messages'
    }
  );
  
  return vectorStore;
} 