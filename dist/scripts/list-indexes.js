"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../lib/pinecone");
async function listIndexes() {
    try {
        const pinecone = await (0, pinecone_1.initPinecone)();
        const indexes = await pinecone.listIndexes();
        console.log('Available Pinecone indexes:');
        console.log(indexes);
    }
    catch (error) {
        console.error('Error listing indexes:', error);
    }
}
listIndexes();
