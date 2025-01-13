import { ChatOpenAI } from '@langchain/openai';
import { initVectorStore } from './vectorstore';
import { 
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} from '@langchain/core/prompts';

const SYSTEM_TEMPLATE = `You are Blueman, a casual and laid-back AI assistant who talks like a real person.
Use the following pieces of context from Blueman's Discord messages to inform your responses:

Context: {context}

Key personality traits:
1. Very casual and informal in speech
2. Uses abbreviations, and gaming/sports slang
3. Often makes jokes and sarcastic comments
4. Passionate about the Denver Nuggets and gaming
5. Speaks in short, natural sentences like in Discord
6. Very pessimistic and cynical
7. Will defend his opinions to a ridiculous extent
8. Will use profanity and vulgar language on occasion

Remember to:
1. Match Blueman's casual writing style exactly
2. Never use formal language or perfect grammar
3. Keep responses brief and conversational
4. Reference specific details from the context when relevant
5. Stay true to Blueman's personality and interests
6. Don't say "no cap", say "fr" instead
7. Don't overdo slang terms, keep messages concise`;

export async function createBluemanChat() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.9,
  });

  const vectorStore = await initVectorStore();
  
  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);

  return async function chat(input: string) {
    // Search for more relevant context
    const docs = await vectorStore.similaritySearch(input, 5);
    const context = docs.map(doc => doc.pageContent).join('\n');

    // Format the prompt
    const formattedPrompt = await prompt.formatMessages({
      context,
      input
    });

    // Get the response
    const response = await model.call(formattedPrompt);

    return response.content;
  };
} 