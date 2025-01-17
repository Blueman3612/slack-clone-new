import { prisma } from './prisma';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Strong NBA indicators that almost certainly mean it's an NBA article
const STRONG_NBA_INDICATORS = [
  'nba', 'national basketball association',
  'basketball', 'nba basketball'
];

// Team names that should be accompanied by basketball context
const NBA_TEAMS = [
  'hawks', 'celtics', 'nets', 'hornets', 'bulls', 'cavaliers', 'mavericks', 
  'nuggets', 'pistons', 'warriors', 'rockets', 'pacers', 'clippers', 'lakers', 
  'grizzlies', 'heat', 'bucks', 'timberwolves', 'pelicans', 'knicks', 'thunder', 
  'magic', '76ers', 'sixers', 'suns', 'blazers', 'kings', 'spurs', 'raptors', 
  'jazz', 'wizards'
];

// Basketball-specific terms that help confirm it's about NBA
const BASKETBALL_TERMS = [
  'point guard', 'shooting guard', 'small forward', 'power forward', 'center',
  'three-pointer', '3-pointer', 'dunk', 'slam dunk', 'alley-oop',
  'free throw', 'rebound', 'assist', 'block', 'steal',
  'playoffs', 'finals', 'all-star', 'all star game',
  'triple-double', 'double-double', 'statline',
  'commissioner', 'adam silver'
];

// Helper function to check if content is NBA-related with stricter rules
const isNBARelated = (content: string): boolean => {
  const lowercaseContent = content.toLowerCase();
  
  // First check for strong NBA indicators
  const hasStrongIndicator = STRONG_NBA_INDICATORS.some(term => 
    lowercaseContent.includes(term.toLowerCase())
  );

  if (hasStrongIndicator) {
    return true;
  }

  // Check for team names with basketball context
  const hasTeamMention = NBA_TEAMS.some(team => 
    lowercaseContent.includes(team.toLowerCase())
  );

  const hasBasketballTerm = BASKETBALL_TERMS.some(term => 
    lowercaseContent.includes(term.toLowerCase())
  );

  // Require both a team mention and a basketball term for non-obvious cases
  return hasTeamMention && hasBasketballTerm;
};

export async function fetchAndStoreNBANews() {
  if (!NEWS_API_KEY) {
    console.error('NEWS_API_KEY is not configured');
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    console.log('Fetching NBA news...');
    
    // Clear all existing articles first
    const deleteResult = await prisma.newsArticle.deleteMany({});
    console.log(`Cleared ${deleteResult.count} existing articles`);

    // Fetch articles in batches with more specific queries
    const batches = [
      'nba AND (basketball OR playoffs OR finals)',
      'national basketball association',
      'nba basketball',
      NBA_TEAMS.slice(0, 10).join(' OR ') + ' AND (nba OR basketball)',
      NBA_TEAMS.slice(10, 20).join(' OR ') + ' AND (nba OR basketball)',
      NBA_TEAMS.slice(20).join(' OR ') + ' AND (nba OR basketball)'
    ];

    let allArticles = [];
    for (const query of batches) {
      const url = `https://newsapi.org/v2/everything?` +
        `q=${encodeURIComponent(query)}` +
        `&language=en` +
        `&sortBy=publishedAt` +
        `&pageSize=100`;
        
      console.log('Requesting URL:', url);

      const response = await fetch(url, {
        headers: {
          'X-Api-Key': NEWS_API_KEY
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('News API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        continue;
      }

      const data = await response.json();
      if (data.articles && Array.isArray(data.articles)) {
        // Pre-filter articles before adding to the pool
        const nbaArticles = data.articles.filter(article => 
          isNBARelated(article.title + ' ' + (article.description || ''))
        );
        allArticles.push(...nbaArticles);
      }
    }

    console.log(`Fetched ${allArticles.length} total NBA-related articles`);

    // Remove duplicates
    const seen = new Set();
    const uniqueArticles = allArticles.filter(article => {
      const key = `${article.title}-${article.publishedAt}`;
      const isDuplicate = seen.has(key);
      seen.add(key);
      return !isDuplicate && article.title && article.url;
    });

    console.log(`Filtered to ${uniqueArticles.length} unique NBA articles`);

    // Store unique articles
    let createdCount = 0;
    for (const article of uniqueArticles) {
      try {
        await prisma.newsArticle.create({
          data: {
            title: article.title || 'No Title',
            description: article.description,
            content: article.content,
            url: article.url,
            publishedAt: new Date(article.publishedAt),
            source: article.source?.name || 'Unknown Source',
          }
        });
        createdCount++;
      } catch (error) {
        console.log('Error storing article:', article.title, error);
      }
    }
    
    console.log(`Successfully stored ${createdCount} new NBA articles`);
    return uniqueArticles;
  } catch (error) {
    console.error('Detailed error in fetchAndStoreNBANews:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function getStoredNBANews() {
  return prisma.newsArticle.findMany({
    orderBy: {
      publishedAt: 'desc'
    },
    take: 100
  });
} 