const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: 'https://api.pinecone.io'
});

async function initVectorStore() {
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

module.exports = {
  initVectorStore
}; 