import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// NBA-related keywords for filtering
const NBA_KEYWORDS = [
  // Teams (all NBA teams)
  'hawks', 'celtics', 'nets', 'hornets', 'bulls', 'cavaliers', 'mavericks', 
  'nuggets', 'pistons', 'warriors', 'rockets', 'pacers', 'clippers', 'lakers', 
  'grizzlies', 'heat', 'bucks', 'timberwolves', 'pelicans', 'knicks', 'thunder', 
  'magic', '76ers', 'sixers', 'suns', 'blazers', 'kings', 'spurs', 'raptors', 
  'jazz', 'wizards',

  // Common NBA terms
  'nba', 'basketball', 'national basketball association',
  'playoffs', 'finals', 'all-star', 'all star game',
  'triple-double', 'double-double', 'statline',
  'commissioner', 'adam silver',

  // Game-related terms
  'point guard', 'shooting guard', 'small forward', 'power forward', 'center',
  'three-pointer', '3-pointer', 'dunk', 'slam dunk', 'alley-oop',
  'free throw', 'rebound', 'assist', 'block', 'steal',

  // League events
  'draft', 'trade deadline', 'free agency', 'summer league',
  'training camp', 'preseason', 'regular season',

  // Star players
  'lebron james', 'steph curry', 'kevin durant', 'giannis antetokounmpo',
  'nikola jokic', 'luka doncic', 'joel embiid', 'anthony edwards',
  'jayson tatum', 'devin booker', 'damian lillard'
];

// Helper function to check if content is NBA-related
const isNBARelated = (content: string): boolean => {
  const lowercaseContent = content.toLowerCase();
  // Require at least one strong NBA indicator
  return NBA_KEYWORDS.some(keyword => lowercaseContent.includes(keyword.toLowerCase()));
};

// Helper function to remove duplicate articles
const removeDuplicates = (articles: any[]) => {
  const seen = new Set();
  return articles.filter(article => {
    const key = `${article.title}-${article.publishedAt}`;
    const isDuplicate = seen.has(key);
    seen.add(key);
    return !isDuplicate;
  });
};

export async function GET() {
  try {
    // Clear all existing articles first
    await prisma.newsArticle.deleteMany({});
    console.log('Cleared existing articles');

    // First get more articles than we need since we'll be filtering
    const allArticles = await prisma.newsArticle.findMany({
      orderBy: {
        publishedAt: 'desc'
      },
      take: 1000 // Get even more articles to ensure we have enough after strict filtering
    });

    // Remove duplicates first
    const uniqueArticles = removeDuplicates(allArticles);

    // Filter for NBA-related content
    const nbaArticles = uniqueArticles.filter(article => 
      isNBARelated(article.title + ' ' + (article.description || ''))
    );

    // Take only the 100 most recent NBA articles
    const recentNBAArticles = nbaArticles.slice(0, 100);

    console.log(`Filtered ${allArticles.length} articles to ${uniqueArticles.length} unique articles to ${recentNBAArticles.length} NBA-related articles`);

    return NextResponse.json(recentNBAArticles);
  } catch (error) {
    console.error("[ARTICLES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 