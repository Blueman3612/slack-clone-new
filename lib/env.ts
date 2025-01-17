import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

export const env = {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX: process.env.PINECONE_INDEX,
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
  LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
  LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT,
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'PINECONE_API_KEY',
  'PINECONE_INDEX',
  'OPENAI_API_KEY',
  'LANGCHAIN_API_KEY',
  'LANGCHAIN_ENDPOINT'
] as const;

for (const key of requiredEnvVars) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
} 