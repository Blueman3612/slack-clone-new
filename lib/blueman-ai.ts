import { prisma } from './prisma';
import { getNBAContext } from './nba-knowledge';
import { NewsArticle } from '@prisma/client';
import OpenAI from 'openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { env } from '@/lib/env';
import { SYSTEM_TEMPLATE } from '@/lib/blueman-template';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

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

// Add NBA-related keywords for filtering
const NBA_KEYWORDS = [
  'nba', 'basketball', 'playoffs', 'finals', 'all-star',
  'timberwolves', 'wolves', 'lakers', 'celtics', 'warriors',
  'anthony edwards', 'lebron', 'curry', 'durant', 'jokic',
  'dunk', 'three-pointer', 'triple-double', 'double-double',
  'eastern conference', 'western conference', 'commissioner',
  'draft', 'trade', 'free agency', 'contract', 'roster'
];

// Filter articles for NBA content
const filterNBAArticles = (articles: any[]) => {
  return articles.filter(article => {
    const content = (article.title + ' ' + article.description).toLowerCase();
    return NBA_KEYWORDS.some(keyword => content.includes(keyword.toLowerCase()));
  });
};

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
    // Fetch articles
    const articlesResponse = await fetch('http://localhost:3000/api/articles');
    if (!articlesResponse.ok) throw new Error('Failed to fetch articles');
    const articles = await articlesResponse.json();

    // Filter for NBA-related articles
    const nbaArticles = filterNBAArticles(articles);
    console.log(`Found ${nbaArticles.length} NBA-related articles out of ${articles.length} total`);

    // Format the articles for the context
    const articlesContext = nbaArticles
      .slice(0, 5) // Use top 5 NBA-related articles
      .map(article => `${article.title}: ${article.description}`)
      .join('\n');

    // Get the chat history
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60) // Last hour
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 10,
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    // Format the chat context
    const chatContext = messages
      .map(msg => `${msg.user.name}: ${msg.content}`)
      .join('\n');

    const systemMessage = `You are Blueman AI, a knowledgeable and enthusiastic NBA fan assistant.
You have access to recent NBA news and chat context to help you engage in natural conversations.
Keep your responses conversational, engaging, and focused on basketball.
Use your knowledge of NBA history, players, and current events to provide insightful comments.
Recent NBA News:
${articlesContext}

Recent Chat Context:
${chatContext}`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return aiResponse.choices[0]?.message?.content || null;
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