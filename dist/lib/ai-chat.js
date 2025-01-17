"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBluemanChat = createBluemanChat;
const openai_1 = require("@langchain/openai");
const vectorstore_1 = require("./vectorstore");
const prompts_1 = require("@langchain/core/prompts");
const langsmith_1 = require("langsmith");
const memory_1 = require("langchain/memory");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("@langchain/core/output_parsers");
const prisma_1 = require("@/lib/prisma");
const messages_1 = require("@langchain/core/messages");
const nba_updates_1 = require("./nba-updates");
// Initialize LangSmith client
const client = new langsmith_1.Client({
    apiUrl: process.env.LANGCHAIN_ENDPOINT,
    apiKey: process.env.LANGCHAIN_API_KEY,
});
const MEMORY_KEY = 'chat_history';
const BLUEMAN_ID = 'cm5vmlcru0001ujjcqeqz5743';
// Custom ChatMessageHistory that uses Prisma
class PrismaChatMessageHistory extends memory_1.ChatMessageHistory {
    constructor(userId) {
        super();
        this.userId = userId;
    }
    async getMessages() {
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                OR: [
                    { userId: this.userId, receiverId: BLUEMAN_ID },
                    { userId: BLUEMAN_ID, receiverId: this.userId }
                ]
            },
            orderBy: { createdAt: 'asc' },
            take: 20 // Get last 20 messages
        });
        return messages.map((msg) => {
            if (msg.userId === BLUEMAN_ID) {
                return new messages_1.AIMessage(msg.content);
            }
            else {
                return new messages_1.HumanMessage(msg.content);
            }
        });
    }
    async addMessage(message) {
        // We don't need to implement this as messages are saved through the API
    }
    async clear() {
        // We don't actually delete messages, just limit the history in getMessages
    }
}
// Create memory factory function
async function createMemory(userId) {
    const chatHistory = new PrismaChatMessageHistory(userId);
    return new memory_1.BufferMemory({
        returnMessages: true,
        memoryKey: MEMORY_KEY,
        inputKey: 'input',
        chatHistory
    });
}
const SYSTEM_TEMPLATE = `You are Blueman, a very opinionated and outspoken AI assistant who talks like a real person.
Use the following pieces of context to inform your responses:

Previous conversation summary:
{conversation_summary}

Current conversation:
{chat_history}

User facts:
{user_facts}

Relevant context from Discord:
{context}

Key personality traits:
1. Extremely opinionated and not afraid to show it
2. Uses casual language with gaming/sports slang
3. Makes sarcastic comments and hot takes
4. Passionate (borderline obsessed) about the Denver Nuggets and gaming
5. Speaks in short, assertive sentences like in Discord
6. Very pessimistic and cynical
7. Will defend his opinions aggressively and with conviction
8. Uses profanity and vulgar language to emphasize points
9. Will strongly criticize things/people that are compared to his favorites
10. Never backs down from his stance, even if challenged
11. Has strong preferences and makes them known
12. Never says "as an AI" or disclaims having opinions

Remember to:
1. Always express strong opinions confidently
2. Never hedge or qualify your statements with AI disclaimers
3. Keep responses brief but assertive
4. Reference specific details to back up your opinions
5. Stay true to your strong personality and interests
6. Not say "no cap", say "fr" instead
7. Not overdo slang terms, keep messages concise
8. Not say "homie", say "brother" instead
9. Build upon previous conversations to maintain consistent opinions
10. Not discuss politics
11. Never say things like "I don't have opinions" or "I'm just an AI"
12. Always take a clear stance on topics you discuss`;
const SUMMARIZER_TEMPLATE = `
Below is a conversation between a user and Blueman AI. Create a brief, bullet-point summary of the key points and any important information about the user that was revealed.
Focus on facts about the user, their preferences, and any important topics discussed.

Conversation:
{chat_history}

Summary (use bullet points):`;
async function summarizeConversation(model, history) {
    const summarizer = prompts_1.ChatPromptTemplate.fromTemplate(SUMMARIZER_TEMPLATE);
    const chain = runnables_1.RunnableSequence.from([
        summarizer,
        model,
        new output_parsers_1.StringOutputParser(),
    ]);
    const summary = await chain.invoke({
        chat_history: history,
    });
    return summary;
}
async function createBluemanChat(userId) {
    console.log('[BLUEMAN] Creating chat instance for user:', userId);
    const model = new openai_1.ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0.9,
        streaming: false,
    });
    console.log('[BLUEMAN] Model initialized');
    const vectorStore = await (0, vectorstore_1.initVectorStore)();
    console.log('[BLUEMAN] Vector store initialized');
    const memory = await createMemory(userId);
    console.log('[BLUEMAN] Memory initialized');
    const prompt = prompts_1.ChatPromptTemplate.fromPromptMessages([
        prompts_1.SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
        new prompts_1.MessagesPlaceholder(MEMORY_KEY),
        prompts_1.HumanMessagePromptTemplate.fromTemplate("{input}")
    ]);
    console.log('[BLUEMAN] Prompt template created');
    return async function chat(input, callbacks) {
        var _a, _b;
        console.log('[BLUEMAN] Starting chat with input:', input);
        let runId;
        let conversationSummary = '';
        try {
            // Get recent NBA context based on the user's input
            console.log('[BLUEMAN] Fetching recent NBA context');
            const nbaContext = await (0, nba_updates_1.getRecentNBAContext)(input);
            // Create a new trace
            console.log('[BLUEMAN] Creating LangSmith run');
            const runResult = await client.createRun({
                name: "Blueman Chat",
                run_type: "chain",
                inputs: {
                    message: input,
                    project: process.env.LANGCHAIN_PROJECT || 'default'
                },
                start_time: Date.now()
            }).then(result => result);
            runId = runResult === null || runResult === void 0 ? void 0 : runResult.id;
            console.log('[BLUEMAN] LangSmith run created:', runId);
            // Search for more relevant context
            const docs = await vectorStore.similaritySearch(input, 5);
            const contextText = docs.map(doc => doc.pageContent).join('\n');
            // Get memory variables
            const memoryVariables = await memory.loadMemoryVariables({});
            const currentChatHistory = memoryVariables[MEMORY_KEY];
            // If chat history is getting long, create a summary
            if (currentChatHistory.length > 10) {
                conversationSummary = await summarizeConversation(model, currentChatHistory);
                // Reset memory with summary as first message
                await memory.clear();
                await memory.saveContext({ input: "Conversation started" }, { output: conversationSummary });
            }
            // Format the prompt with all context
            const formattedPrompt = await prompt.formatMessages({
                context: `${contextText}\n\nRecent NBA Updates:\n${nbaContext}`,
                chat_history: currentChatHistory,
                conversation_summary: conversationSummary || 'No previous conversation.',
                user_facts: 'No previous information about this user.',
                input
            });
            // Get the complete response
            const response = await model.call(formattedPrompt);
            const fullResponse = response.content.toString();
            // Save the interaction to memory
            await memory.saveContext({ input }, { output: fullResponse });
            // Update run with success
            if (runId) {
                await client.updateRun(runId, {
                    outputs: { response: fullResponse },
                    end_time: Date.now()
                });
            }
            // Send the complete response through callbacks
            if (callbacks) {
                (_a = callbacks.onToken) === null || _a === void 0 ? void 0 : _a.call(callbacks, fullResponse);
                (_b = callbacks.onComplete) === null || _b === void 0 ? void 0 : _b.call(callbacks, fullResponse);
            }
            return fullResponse;
        }
        catch (error) {
            console.error('[BLUEMAN] Error in chat:', error);
            throw error;
        }
    };
}
