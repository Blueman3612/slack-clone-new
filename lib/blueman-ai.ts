import { prisma } from './prisma';
import { getNBAContext } from './nba-knowledge';
import { NewsArticle } from '@prisma/client';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { env } from '@/lib/env';
import { SYSTEM_TEMPLATE } from '@/lib/blueman-template';

interface MessageContext {
  recentMessages: string[];
  newsContext?: string;
  nbaContext?: string;
  userRole?: string;
}

// Keywords that might trigger Blueman's interest
const TRIGGER_KEYWORDS = [
  // General basketball terms
  'nba', 'basketball', 'game', 'score', 'player',
  'stats', 'team', 'trade', 'injury', 'season', 'playoff',
  'championship', 'finals', 'draft', 'coach', 'roster',
  
  // Teams
  'nuggets', 'timberwolves', 'wolves', 'lakers', 'warriors',
  'celtics', 'bulls', 'heat', 'suns', 'mavs', 'mavericks',
  'bucks', 'sixers', '76ers', 'nets', 'clippers',
  
  // Player references
  'ant', 'anthony edwards', 'edwards', 'jokic', 'murray',
  'lebron', 'curry', 'doncic', 'giannis', 'embiid'
];

// Function to check if Blueman should respond to a message
export async function shouldBluemanRespond(message: string): Promise<boolean> {
  const lowercaseMessage = message.toLowerCase();
  
  // Check if message contains any trigger keywords
  const containsTriggerWord = TRIGGER_KEYWORDS.some(keyword => 
    lowercaseMessage.includes(keyword.toLowerCase())
  );

  if (!containsTriggerWord) {
    return false;
  }

  // Get NBA context to see if there's relevant information
  const nbaContext = await getNBAContext(message);
  
  // Allow responses even without NBA context if it's about specific players or teams
  const containsSpecificReference = lowercaseMessage.includes('anthony edwards') || 
    lowercaseMessage.includes('timberwolves') ||
    lowercaseMessage.includes('wolves');
    
  if (!nbaContext || nbaContext === 'No NBA data available.') {
    return containsSpecificReference;
  }

  return true;
}

// Function to get Blueman's response to a message
export async function getBluemanResponse(message: string, channelId: string): Promise<string | null> {
  try {
    // Get recent channel context
    const recentMessages = await prisma.message.findMany({
      where: {
        channelId,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });

    const context: MessageContext = {
      recentMessages: recentMessages.map(msg => 
        `${msg.user.name}: ${msg.content}`
      )
    };

    // Get NBA context
    context.nbaContext = await getNBAContext(message);
    console.log('NBA Context:', context.nbaContext);

    // Get news context
    const newsArticles = await prisma.newsArticle.findMany({
      orderBy: {
        publishedAt: 'desc'
      },
      take: 15
    });

    if (newsArticles.length > 0) {
      context.newsContext = newsArticles.map(article => {
        const date = article.publishedAt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        return `[${date}] ${article.title}\n${article.description || ''}`;
      }).join('\n\n');
    }

    console.log('Preparing Blueman response with context:', {
      messageLength: message.length,
      recentMessagesCount: context.recentMessages.length,
      hasNBAContext: !!context.nbaContext,
      hasNewsContext: !!context.newsContext
    });

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
        .replace('{nba_context}', context.nbaContext || 'No NBA data available.')
        .replace('{news_context}', context.newsContext || 'No recent news available.')
        .replace('{context}', '')
        .replace('{conversation_summary}', '')
        .replace('{chat_history}', context.recentMessages.join('\n'))
    });

    // Create the user's message
    const userMessage = new HumanMessage({
      content: message
    });

    console.log('Sending request to AI model');
    
    // Get the complete response
    const response = await model.invoke([systemMessage, userMessage]);
    console.log('Got AI response');
    
    return response.content.toString();
  } catch (error) {
    console.error('Error in getBluemanResponse:', error);
    return null;
  }
}

// Function to get relevant news articles
async function getRelevantNews(query: string): Promise<string> {
  try {
    const recentNews = await prisma.newsArticle.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 5
    });

    if (recentNews.length === 0) {
      return '';
    }

    const newsContext = recentNews.map((article: NewsArticle) => {
      const date = article.publishedAt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      return `[${date}] ${article.title}\n${article.description || ''}`;
    }).join('\n\n');

    return `Recent News:\n${newsContext}`;
  } catch (error) {
    console.error('Error getting news context:', error);
    return '';
  }
}

export async function getMessageContext(message: string, userId: string): Promise<MessageContext> {
  const context: MessageContext = {
    recentMessages: []
  };

  // Get recent messages for context
  const recentMessages = await prisma.message.findMany({
    where: {
      OR: [
        { userId },
        { receiverId: userId }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      user: true,
      receiver: true
    }
  });

  context.recentMessages = recentMessages.reverse().map(msg => 
    `${msg.user.name}: ${msg.content}`
  );

  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  context.userRole = user?.role;

  // If message mentions news or current events, add news context
  if (message.toLowerCase().includes('news') || 
      message.toLowerCase().includes('current') || 
      message.toLowerCase().includes('latest')) {
    context.newsContext = await getRelevantNews(message);
  }

  // If message mentions NBA, basketball, or sports, add NBA context
  if (message.toLowerCase().includes('nba') || 
      message.toLowerCase().includes('basketball') || 
      message.toLowerCase().includes('sports')) {
    context.nbaContext = await getNBAContext(message);
  }

  return context;
}

export function formatContextForAI(context: MessageContext): string {
  let aiContext = '';

  // Add conversation history
  if (context.recentMessages.length > 0) {
    aiContext += 'Recent conversation:\n';
    aiContext += context.recentMessages.join('\n');
    aiContext += '\n\n';
  }

  // Add news context if available
  if (context.newsContext) {
    aiContext += context.newsContext;
    aiContext += '\n\n';
  }

  // Add NBA context if available
  if (context.nbaContext) {
    aiContext += context.nbaContext;
    aiContext += '\n\n';
  }

  // Add user role context
  if (context.userRole) {
    aiContext += `User Role: ${context.userRole}\n\n`;
  }

  return aiContext;
} 