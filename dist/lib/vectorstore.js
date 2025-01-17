"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initVectorStore = initVectorStore;
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@langchain/pinecone");
const env_1 = require("./env");
// Initialize Pinecone client
const pinecone = new pinecone_1.Pinecone({
    apiKey: env_1.env.PINECONE_API_KEY
});
async function initVectorStore() {
    try {
        console.log('Initializing Pinecone index:', env_1.env.PINECONE_INDEX);
        const index = pinecone.Index(env_1.env.PINECONE_INDEX);
        console.log('Creating vector store with OpenAI embeddings');
        const vectorStore = await pinecone_2.PineconeStore.fromExistingIndex(new openai_1.OpenAIEmbeddings({
            openAIApiKey: env_1.env.OPENAI_API_KEY
        }), {
            pineconeIndex: index
        });
        console.log('Vector store initialized successfully');
        return vectorStore;
    }
    catch (error) {
        console.error('Error initializing vector store:', error);
        throw error;
    }
}
