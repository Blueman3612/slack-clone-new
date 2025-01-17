import { prisma } from './prisma';
import { getNBAContext } from './nba-knowledge';
import { NewsArticle } from '@prisma/client';

interface MessageContext {
  recentMessages: string[];
  newsContext?: string;
  nbaContext?: string;
  userRole?: string;
}

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