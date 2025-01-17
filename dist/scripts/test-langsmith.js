"use strict";
const { Client } = require('langsmith');
const dotenv = require('dotenv');
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
async function testLangSmith() {
    try {
        console.log('Testing LangSmith connection...');
        const client = new Client({
            apiUrl: process.env.LANGCHAIN_ENDPOINT,
            apiKey: process.env.LANGCHAIN_API_KEY,
        });
        // Create a simple test run
        const run = await client.createRun({
            name: "Connection Test",
            run_type: "chain",
            inputs: { test: "Hello LangSmith!" },
            start_time: Date.now()
        });
        console.log('Successfully created run:', run);
        console.log('LangSmith connection test completed successfully!');
    }
    catch (error) {
        console.error('Error testing LangSmith:', error);
    }
}
testLangSmith();
