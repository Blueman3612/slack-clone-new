"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPinecone = initPinecone;
const pinecone_1 = require("@pinecone-database/pinecone");
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
async function initPinecone() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        throw new Error('PINECONE_API_KEY is not set in environment variables');
    }
    console.log('Initializing Pinecone...');
    console.log('API Key:', apiKey.slice(0, 5) + '...'); // Only show first 5 chars for security
    try {
        const pinecone = new pinecone_1.Pinecone({
            apiKey,
            // Use the controller URL for your region
            controllerHostUrl: 'https://api.pinecone.io'
        });
        return pinecone;
    }
    catch (error) {
        console.error('Error initializing Pinecone:', error);
        throw error;
    }
}
