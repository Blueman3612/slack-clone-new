"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
// Load environment variables from .env.local
(0, dotenv_1.config)({ path: path_1.default.resolve(process.cwd(), '.env.local') });
exports.env = {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
    LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT,
};
// Validate required environment variables
const requiredEnvVars = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX',
    'OPENAI_API_KEY',
    'LANGCHAIN_API_KEY',
    'LANGCHAIN_ENDPOINT'
];
for (const key of requiredEnvVars) {
    if (!exports.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}
