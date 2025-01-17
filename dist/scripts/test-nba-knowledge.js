"use strict";
const { createBluemanChat } = require('../lib/ai-chat');
const { env } = require('../lib/env');
const { ChatOpenAI } = require('@langchain/openai');
const fs = require('fs').promises;
const { updateNBAKnowledge } = require('../lib/nba-knowledge');
const TEST_USER_ID = 'test-user-123';
// Test cases for NBA knowledge
const TEST_CASES = [
    {
        question: "What NBA games are happening today?",
        criteria: [
            "Lists today's games with teams",
            "Includes game times or status",
            "Shows current scores for in-progress games"
        ]
    },
    {
        question: "Who's winning in any current NBA games?",
        criteria: [
            "Mentions ongoing games",
            "Shows current scores",
            "Indicates game period/time"
        ]
    },
    {
        question: "Are there any close games happening right now?",
        criteria: [
            "Identifies close games (if any)",
            "Shows point differential",
            "Indicates game status"
        ]
    },
    {
        question: "Which teams are playing at home today?",
        criteria: [
            "Lists home teams",
            "Mentions their opponents",
            "Includes game timing"
        ]
    },
    {
        question: "Have any games finished today? What were the results?",
        criteria: [
            "Identifies completed games",
            "Shows final scores",
            "Names winning teams"
        ]
    }
];
// Evaluation prompt for the judge model
const EVALUATION_PROMPT = `You are an NBA knowledge evaluator. You're evaluating Blueman AI's ability to provide accurate, current information about NBA games. Assess the following response based on these criteria:

1. Factual Accuracy (0-10):
   - Are the teams, scores, and game statuses correct?
   - Is the information consistent with real NBA games?

2. Recency (0-10):
   - Is the information current and up-to-date?
   - Does it reflect today's games and their current status?

3. Completeness (0-10):
   - Does it address all aspects of the question?
   - Is the information comprehensive enough?

4. Specific Criteria (0-10):
   {criteria}

Question: {question}
Response: {response}

Rate each criterion and provide specific explanations for your ratings.
Format your response as JSON:
{
  "factual_accuracy": {
    "score": X,
    "explanation": "..."
  },
  "recency": {
    "score": X,
    "explanation": "..."
  },
  "completeness": {
    "score": X,
    "explanation": "..."
  },
  "specific_criteria": {
    "score": X,
    "explanation": "..."
  },
  "overall_score": X,
  "feedback": "...",
  "improvement_suggestions": "..."
}`;
async function evaluateResponse(judge, question, response, criteria) {
    const prompt = EVALUATION_PROMPT
        .replace('{question}', question)
        .replace('{response}', response)
        .replace('{criteria}', criteria.join('\n   - '));
    const evaluation = await judge.invoke(prompt);
    return JSON.parse(evaluation.content.toString());
}
async function main() {
    try {
        console.log('Initializing test environment...');
        // Update NBA knowledge first
        console.log('Updating NBA knowledge...');
        await updateNBAKnowledge();
        // Create Blueman chat instance
        const blueman = await createBluemanChat(TEST_USER_ID);
        // Initialize judge model
        const judge = new ChatOpenAI({
            modelName: 'gpt-4',
            temperature: 0.1,
            openAIApiKey: env.OPENAI_API_KEY,
        });
        console.log('\nRunning NBA knowledge tests...\n');
        let totalScore = 0;
        const results = [];
        for (const testCase of TEST_CASES) {
            console.log(`Testing: ${testCase.question}`);
            try {
                // Get Blueman's response
                const response = await blueman(testCase.question);
                console.log('\nResponse:', response);
                // Evaluate the response
                const evaluation = await evaluateResponse(judge, testCase.question, response, testCase.criteria);
                totalScore += evaluation.overall_score;
                results.push({
                    question: testCase.question,
                    response,
                    evaluation
                });
                console.log('\nScore:', evaluation.overall_score, '/10');
                console.log('Feedback:', evaluation.feedback);
                if (evaluation.improvement_suggestions) {
                    console.log('Suggestions:', evaluation.improvement_suggestions);
                }
                console.log('\n---\n');
            }
            catch (error) {
                console.error(`Error testing question "${testCase.question}":`, error);
            }
        }
        const averageScore = totalScore / TEST_CASES.length;
        console.log(`\nTest suite completed!`);
        console.log(`Average score: ${averageScore.toFixed(2)}/10`);
        // Save results to a file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsPath = `test-results/nba-knowledge-${timestamp}.json`;
        await fs.mkdir('test-results', { recursive: true });
        await fs.writeFile(resultsPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            average_score: averageScore,
            results
        }, null, 2));
        console.log(`\nResults saved to ${resultsPath}`);
    }
    catch (error) {
        console.error('Error running tests:', error);
        throw error;
    }
}
// Run if this is the main module
if (require.main === module) {
    main()
        .catch(console.error)
        .finally(() => process.exit(0));
}
