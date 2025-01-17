import { ChatOpenAI } from '@langchain/openai';
import { initVectorStore } from './vectorstore';
import { ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { Client } from 'langsmith';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { prisma } from '@/lib/prisma';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { getRecentNBAContext } from './nba-updates';
import { SYSTEM_TEMPLATE } from './blueman-template';
import { AIStreamCallbackHandler } from '@/types';

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

  async getMessages() {
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

    return messages.map((msg) => {
      if (msg.userId === BLUEMAN_ID) {
        return new AIMessage(msg.content);
      } else {
        return new HumanMessage(msg.content);
      }
    });
  }

  async addMessage(message: any) {
    // We don't need to implement this as messages are saved through the API
  }

  async clear() {
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
  console.log('[BLUEMAN] Creating chat instance for user:', userId);
  
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.9,
    streaming: false,
    maxTokens: 1000,  // Reduced from 7000 to leave more room for context
  });
  console.log('[BLUEMAN] Model initialized');

  const vectorStore = await initVectorStore();
  console.log('[BLUEMAN] Vector store initialized');
  
  const memory = await createMemory(userId);
  console.log('[BLUEMAN] Memory initialized');
  
  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    new MessagesPlaceholder(MEMORY_KEY),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);
  console.log('[BLUEMAN] Prompt template created');

  return async function chat(
    input: string,
    callbacks?: AIStreamCallbackHandler
  ) {
    console.log('[BLUEMAN] Starting chat with input:', input);
    let runId: string | undefined;
    let conversationSummary = '';
    let isNBARelated = false;
    let combinedNBAContext = '';

    try {
      // Get recent NBA context based on the user's input
      console.log('[BLUEMAN] Fetching recent NBA context');
      const nbaContext = await getRecentNBAContext(input);

      // Only include NBA context if the input is NBA-related
      const isNBARelated = input.toLowerCase().includes('nba') || 
                     input.toLowerCase().includes('basketball') ||
                     input.toLowerCase().includes('nuggets') ||
                     input.toLowerCase().includes('jokic');
      
      // Format the NBA context to be more assertive
      const formattedNBAContext = isNBARelated 
        ? `CURRENT NBA DATA (USE THIS ONLY):\n${nbaContext}`
        : 'No NBA data requested.';

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
      }).then(result => result as unknown as RunResult);

      runId = runResult?.id;
      console.log('[BLUEMAN] LangSmith run created:', runId);

      // Search for more relevant context but limit results
      const docs = await vectorStore.similaritySearch(input, 2);  // Reduced from 3 to 2
      const contextText = docs.map(doc => doc.pageContent).join('\n').slice(0, 500);  // Further reduced

      // Get memory variables but limit history
      const memoryVariables = await memory.loadMemoryVariables({});
      const currentChatHistory = memoryVariables[MEMORY_KEY].slice(-3);  // Only keep last 3 messages

      // Always create a summary to reduce context length
      conversationSummary = await summarizeConversation(model, currentChatHistory);
      
      // Reset memory with summary
      await memory.clear();
      await memory.saveContext(
        { input: "Conversation started" },
        { output: conversationSummary }
      );

      // Format the prompt with all context
      const formattedPrompt = await prompt.formatMessages({
        context: contextText,
        nba_context: formattedNBAContext,
        chat_history: currentChatHistory,
        conversation_summary: conversationSummary.slice(0, 300),  // Limit summary length
        input
      });

      // Get the complete response
      const response = await model.call(formattedPrompt);
      const fullResponse = response.content.toString();

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

      // Send the complete response through callbacks
      if (callbacks) {
        callbacks.onToken?.(fullResponse);
        callbacks.onComplete?.(fullResponse);
      }

      return fullResponse;
    } catch (error: any) {  // Type error as any to access code property
      console.error('[BLUEMAN] Error in chat:', error);
      
      // If it's a token limit error, try again with minimal context
      if (error.code === 'context_length_exceeded') {
        try {
          const minimalPrompt = await prompt.formatMessages({
            context: '',
            nba_context: isNBARelated ? combinedNBAContext.slice(0, 500) : '',
            chat_history: [],
            conversation_summary: '',
            input
          });
          
          const retryResponse = await model.call(minimalPrompt);
          return retryResponse.content.toString();
        } catch (retryError) {
          console.error('[BLUEMAN] Retry failed:', retryError);
          return "Brother, my brain's a bit fried right now. Ask me again in a sec and I'll hook you up with those NBA updates fr.";
        }
      }
      
      return "Brother, my brain's a bit fried right now. Ask me again in a sec and I'll hook you up with those NBA updates fr.";
    }
  };
} 