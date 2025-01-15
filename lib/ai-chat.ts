import { ChatOpenAI } from '@langchain/openai';
import { initVectorStore } from './vectorstore';
import { 
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { Client } from 'langsmith';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AIStreamCallbackHandler } from '@/types';
import { prisma } from '@/lib/prisma';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

interface RunResult {
  id?: string;
}

// Initialize LangSmith client
const client = new Client({
  apiUrl: process.env.LANGCHAIN_ENDPOINT,
  apiKey: process.env.LANGCHAIN_API_KEY,
});

const MEMORY_KEY = 'chat_history';
const BLUEMAN_ID = 'cm5vmlcru0001ujjcqeqz5743';

// Custom ChatMessageHistory that uses Prisma
class PrismaChatMessageHistory extends ChatMessageHistory {
  private userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async getMessages(): Promise<BaseMessage[]> {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { userId: this.userId, receiverId: BLUEMAN_ID },
          { userId: BLUEMAN_ID, receiverId: this.userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 20 // Get last 20 messages
    });

    return messages.map(msg => {
      if (msg.userId === BLUEMAN_ID) {
        return new AIMessage(msg.content);
      } else {
        return new HumanMessage(msg.content);
      }
    });
  }

  async addMessage(message: BaseMessage): Promise<void> {
    // We don't need to implement this as messages are saved through the API
  }

  async clear(): Promise<void> {
    // We don't actually delete messages, just limit the history in getMessages
  }
}

// Create memory factory function
async function createMemory(userId: string) {
  const chatHistory = new PrismaChatMessageHistory(userId);
  return new BufferMemory({
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
6. Very pessimistic and cynical about everything except the Nuggets
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

async function summarizeConversation(model: ChatOpenAI, history: string): Promise<string> {
  const summarizer = ChatPromptTemplate.fromTemplate(SUMMARIZER_TEMPLATE);
  
  const chain = RunnableSequence.from([
    summarizer,
    model,
    new StringOutputParser(),
  ]);

  const summary = await chain.invoke({
    chat_history: history,
  });

  return summary;
}

export async function createBluemanChat(userId: string) {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.9,
    streaming: true,
  });

  const vectorStore = await initVectorStore();
  const memory = await createMemory(userId);
  
  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    new MessagesPlaceholder(MEMORY_KEY),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);

  // Store user facts between conversations
  const userFacts = new Map<string, string>();

  return async function chat(
    input: string,
    callbacks?: AIStreamCallbackHandler
  ) {
    let runId: string | undefined;
    let conversationSummary = '';
    let fullResponse = '';

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
      }).then(result => result as unknown as RunResult);

      runId = runResult?.id;

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
        await memory.saveContext(
          { input: "Conversation started" },
          { output: conversationSummary }
        );
      }

      // Format the prompt with all context
      const formattedPrompt = await prompt.formatMessages({
        context: contextText,
        chat_history: currentChatHistory,
        conversation_summary: conversationSummary || 'No previous conversation.',
        user_facts: 'No previous information about this user.',
        input
      });

      // Get the streaming response
      const response = await model.call(formattedPrompt, {
        callbacks: [{
          handleLLMNewToken(token: string) {
            fullResponse += token;
            callbacks?.onToken?.(token);
          },
          handleLLMEnd() {
            callbacks?.onComplete?.(fullResponse);
          },
          handleLLMError(error: Error) {
            callbacks?.onError?.(error);
          }
        }]
      });

      // Save the interaction to memory
      await memory.saveContext(
        { input },
        { output: fullResponse }
      );

      // Update run with success
      if (runId) {
        await client.updateRun(runId, {
          outputs: { response: fullResponse },
          end_time: Date.now()
        });
      }

      return fullResponse;
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