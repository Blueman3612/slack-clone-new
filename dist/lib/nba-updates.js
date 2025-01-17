"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNBAUpdates = fetchNBAUpdates;
exports.getRecentNBAContext = getRecentNBAContext;
const openai_1 = require("@langchain/openai");
const vectorstore_1 = require("./vectorstore");
const prompts_1 = require("@langchain/core/prompts");
const NBA_SEARCH_PROMPT = `You are an NBA analyst assistant focused on providing detailed, factual information about the NBA, with special emphasis on the Denver Nuggets.

When responding, you MUST:
1. Include specific dates for all events mentioned
2. Include exact scores for any games referenced
3. Provide specific player statistics with shooting splits and efficiency metrics
4. Reference official NBA standings with exact records
5. Include direct quotes when discussing controversies or statements
6. Specify injury details including expected return dates
7. Never say "recent" without specifying the exact date
8. Always provide context for statistics (league rankings, career averages, etc.)

Current request: {query}

Format your response in a clear, structured way that can be easily embedded in a vector store.`;
async function fetchNBAUpdates() {
    const model = new openai_1.ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0.1,
    });
    const prompt = prompts_1.ChatPromptTemplate.fromPromptMessages([
        prompts_1.HumanMessagePromptTemplate.fromTemplate(NBA_SEARCH_PROMPT)
    ]);
    const vectorStore = await (0, vectorstore_1.initVectorStore)();
    try {
        console.log('Fetching NBA updates...');
        // Enhanced queries for more specific information
        const queries = [
            'What are the exact scores and statistics from the Denver Nuggets\' last 3 games? Include dates, opponent scores, and individual player stats.',
            'What is Nikola Jokic\'s current season statistics? Include points, rebounds, assists, shooting percentages, and advanced metrics like PER and Win Shares.',
            'What is the Nuggets\' current record and position in the Western Conference? Include games back from first, winning percentage, and head-to-head records against close competitors.',
            'List all current injuries affecting the Nuggets roster. Include specific injuries, dates occurred, and expected return timelines.',
            'What are the top 3 NBA storylines from the past 24 hours? Include specific quotes, statistics, and context.',
            'What are the current NBA MVP race standings? Include statistics and narrative factors.',
            'What are the latest trade rumors or roster changes affecting the Nuggets? Include sources and dates.',
            'What are the Nuggets\' upcoming schedule and key matchups? Include dates, times, and relevant storylines.'
        ];
        for (const query of queries) {
            console.log(`Fetching update for query: ${query}`);
            const formattedPrompt = await prompt.formatMessages({
                query
            });
            const response = await model.call(formattedPrompt);
            const content = response.content.toString();
            // Store with detailed metadata
            await vectorStore.addDocuments([
                {
                    pageContent: content,
                    metadata: {
                        source: 'nba-updates',
                        type: 'current-events',
                        category: query.includes('Nuggets') ? 'nuggets-specific' : 'general-nba',
                        queryType: query.includes('statistics') ? 'stats' :
                            query.includes('injuries') ? 'injuries' :
                                query.includes('standings') ? 'standings' : 'news',
                        date: new Date().toISOString(),
                        query
                    }
                }
            ]);
        }
        // Clean up old data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Implement deletion of old documents
        // This will be implemented when we have the proper Pinecone filtering setup
        console.log('NBA updates successfully fetched and stored');
    }
    catch (error) {
        console.error('Error fetching NBA updates:', error);
        throw error;
    }
}
async function getRecentNBAContext(query) {
    const vectorStore = await (0, vectorstore_1.initVectorStore)();
    try {
        // Get results without date filtering in the query
        const results = await vectorStore.similaritySearch(query, 10);
        // Filter and sort results after retrieval
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const sortedResults = results
            .filter(doc => {
            var _a, _b;
            return ((_a = doc.metadata) === null || _a === void 0 ? void 0 : _a.source) === 'nba-updates' &&
                new Date(((_b = doc.metadata) === null || _b === void 0 ? void 0 : _b.date) || 0) > sevenDaysAgo;
        })
            .sort((a, b) => {
            var _a, _b;
            const dateA = new Date(((_a = a.metadata) === null || _a === void 0 ? void 0 : _a.date) || 0);
            const dateB = new Date(((_b = b.metadata) === null || _b === void 0 ? void 0 : _b.date) || 0);
            return dateB.getTime() - dateA.getTime();
        })
            .slice(0, 5); // Take top 5 most recent results
        // Combine the results with clear section headers
        return sortedResults
            .map(doc => { var _a, _b, _c; return `${((_b = (_a = doc.metadata) === null || _a === void 0 ? void 0 : _a.queryType) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || 'NBA UPDATE'} (${new Date(((_c = doc.metadata) === null || _c === void 0 ? void 0 : _c.date) || 0).toLocaleString()}):\n${doc.pageContent}`; })
            .join('\n\n');
    }
    catch (error) {
        console.error('Error getting NBA context:', error);
        return ''; // Return empty string on error to allow chat to continue
    }
}
