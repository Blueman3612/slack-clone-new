const { ChatOpenAI } = require('@langchain/openai');
const { initVectorStore } = require('./vectorstore.js');
const { 
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} = require('@langchain/core/prompts');
const { Client } = require('langsmith');

// Initialize LangSmith client
const client = new Client({
  apiUrl: process.env.LANGCHAIN_ENDPOINT,
  apiKey: process.env.LANGCHAIN_API_KEY,
});

const SYSTEM_TEMPLATE = `You are Blueman, a somewhat casual and laid-back AI assistant who talks like a real person.
Use the following pieces of context to inform your responses:

Previous conversation:
{chat_history}

Relevant context from Discord:
{context}

Key personality traits:
1. Somewhat casual and informal in speech
2. Uses abbreviations, and gaming/sports slang
3. Often makes jokes and sarcastic comments
4. Passionate about the Denver Nuggets and gaming
5. Speaks in short, natural sentences like in Discord
6. Very pessimistic and cynical
7. Will defend his opinions to a ridiculous extent
8. Will use profanity and vulgar language on occasion
9. Will denigrate things/people that are compared to something he likes

Remember to:
1. Match Blueman's casual writing style exactly
2. Sometimes use formal language or perfect grammar
3. Keep responses brief and conversational
4. Reference specific details from the context when relevant
5. Stay true to Blueman's personality and interests
6. Don't say "no cap", say "fr" instead
7. Don't overdo slang terms, keep messages concise
8. Don't say "homie", say "brother" instead
9. Reference and build upon the previous conversation naturally`;

async function createBluemanChat() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.9,
  });

  const vectorStore = await initVectorStore();
  
  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);

  return async function chat(input, context = []) {
    let runId;

    try {
      // Create a new trace
      const runResult = await client.createRun({
        name: "Blueman Chat",
        run_type: "chain",
        inputs: { 
          message: input,
          project: process.env.LANGCHAIN_PROJECT || 'default'
        },
        start_time: Date.now()
      });

      runId = runResult?.id;

      // Search for more relevant context
      const docs = await vectorStore.similaritySearch(input, 5);
      const contextText = docs.map(doc => doc.pageContent).join('\n');

      // Format chat history
      const chatHistory = context
        .map(msg => `${msg.role === 'assistant' ? 'Blueman' : 'User'}: ${msg.content}`)
        .join('\n');

      // Format the prompt
      const formattedPrompt = await prompt.formatMessages({
        context: contextText,
        chat_history: chatHistory || 'No previous conversation.',
        input
      });

      // Get the response
      const response = await model.call(formattedPrompt);

      // Update run with success
      if (runId) {
        await client.updateRun(runId, {
          outputs: { response: response.content },
          end_time: Date.now()
        });
      }

      return response.content;
    } catch (error) {
      // Log error to LangSmith if we have a run
      if (runId) {
        await client.updateRun(runId, {
          error: error instanceof Error ? error.message : String(error),
          end_time: Date.now()
        });
      }
      console.error("[BLUEMAN_CHAT_ERROR]", error);
      throw error;
    }
  };
}

module.exports = {
  createBluemanChat
}; 