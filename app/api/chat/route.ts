import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMessageContext, formatContextForAI } from '@/lib/blueman-ai';
import { ChatOpenAI } from '@langchain/openai';
import { env } from '@/lib/env';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { getNBAContext } from '@/lib/nba-knowledge';
import { SYSTEM_TEMPLATE } from '@/lib/blueman-template';

interface AIContext {
  nbaContext?: string;
  context?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log('Chat API received request:', body);

    const { message } = body;
    if (!message) {
      console.error('No message provided');
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get NBA context first
    console.log('Fetching NBA context for:', message);
    const nbaContext = await getNBAContext(message);
    console.log('NBA Context:', nbaContext);

    // Initialize the AI model
    const model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      openAIApiKey: env.OPENAI_API_KEY,
      streaming: false
    });

    // Create the system message with the template
    const systemMessage = new SystemMessage({
      content: SYSTEM_TEMPLATE
        .replace('{nba_context}', nbaContext || 'No NBA data available.')
        .replace('{context}', '')
        .replace('{conversation_summary}', '')
        .replace('{chat_history}', '')
    });

    // Create the user's message
    const userMessage = new HumanMessage({
      content: message
    });

    // Get the complete response
    const response = await model.invoke([systemMessage, userMessage]);
    
    return NextResponse.json({ text: response.content });
    
  } catch (err) {
    console.error("[CHAT]", err);
    return NextResponse.json(
      { error: "An error occurred while processing your request" }, 
      { status: 500 }
    );
  }
} 