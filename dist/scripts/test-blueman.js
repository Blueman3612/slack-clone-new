"use strict";
const { Client } = require('langsmith');
const { ChatOpenAI } = require('@langchain/openai');
const { createBluemanChat } = require('../lib/ai-chat');
const dotenv = require('dotenv');
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
// Initialize LangSmith client
const client = new Client({
    apiUrl: process.env.LANGCHAIN_ENDPOINT,
    apiKey: process.env.LANGCHAIN_API_KEY,
});
// Initialize evaluator model
const evaluator = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
});
// Test cases
const testCases = [
    {
        input: "What do you think about Jokic's performance this season?",
        criteria: [
            "Uses casual language and gaming/sports slang",
            "Shows passion for Denver Nuggets",
            "Makes sarcastic or humorous comments",
            "Keeps response brief and conversational",
            "Uses 'fr' instead of 'no cap'",
            "Shows pessimistic/cynical attitude",
            "References specific games or stats if mentioned in context"
        ]
    },
    {
        input: "Have you played any good games lately?",
        criteria: [
            "Shows enthusiasm for gaming",
            "Uses gaming terminology",
            "Makes cynical or critical comments",
            "Keeps message casual and brief",
            "Avoids saying 'homie', uses 'brother' instead",
            "References specific games from context"
        ]
    }
];
async function evaluateResponse(response, criteria) {
    const prompt = `
    Evaluate the following AI response based on these criteria. 
    For each criterion, rate it 1-10 and explain why.
    
    Response: "${response}"
    
    Criteria:
    ${criteria.join('\n')}
    
    Format your response as JSON with this structure:
    {
      "scores": {
        "criterion": {
          "score": number,
          "explanation": "string"
        }
      },
      "overall_score": number,
      "suggestions": ["string"]
    }
  `;
    const evaluation = await evaluator.invoke(prompt);
    return JSON.parse(typeof evaluation.content === 'string' ? evaluation.content : JSON.stringify(evaluation.content));
}
async function runTests() {
    console.log('Starting Blueman AI tests...');
    const chat = await createBluemanChat();
    for (const testCase of testCases) {
        console.log(`\nTesting with input: "${testCase.input}"`);
        try {
            // Create a test run
            const runResult = await client.createRun({
                name: "Blueman AI Test",
                run_type: "chain",
                inputs: { message: testCase.input },
                start_time: Date.now()
            });
            // Get run ID from result
            const runId = runResult === null || runResult === void 0 ? void 0 : runResult.id;
            if (!runId) {
                throw new Error('Failed to get run ID from LangSmith');
            }
            // Get Blueman's response
            const response = await chat(testCase.input);
            const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
            console.log('\nBlueman response:', responseStr);
            // Evaluate the response
            const evaluation = await evaluateResponse(responseStr, testCase.criteria);
            console.log('\nEvaluation results:', JSON.stringify(evaluation, null, 2));
            // Update run with results
            await client.updateRun(runId, {
                outputs: {
                    response: responseStr,
                    evaluation
                },
                end_time: Date.now()
            });
            // Log results to LangSmith feedback
            await client.createFeedback(runId, "personality_score", {
                score: evaluation.overall_score / 10,
                value: evaluation.suggestions,
                comment: "Automated personality evaluation"
            });
        }
        catch (error) {
            console.error('Error running test:', error);
        }
    }
}
// Run the tests
runTests();
