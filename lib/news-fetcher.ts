import { prisma } from './prisma';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NBA_KEYWORDS = ['NBA', 'basketball', 'Lakers', 'Warriors', 'Celtics', 'Bulls', 'Heat'];
const HOURS_TO_STORE = 24; // Store articles for 24 hours

export async function fetchAndStoreNBANews() {
  if (!NEWS_API_KEY) {
    console.error('NEWS_API_KEY is not configured');
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    console.log('Fetching NBA news with keywords:', NBA_KEYWORDS.join(', '));
    
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(NBA_KEYWORDS.join(' OR '))}` +
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
      throw new Error(`News API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.articles?.length || 0} articles`);
    
    if (!data.articles || !Array.isArray(data.articles)) {
      console.error('Unexpected API response:', data);
      throw new Error('Invalid response format from News API');
    }

    // Delete old articles
    const deleteResult = await prisma.newsArticle.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - HOURS_TO_STORE * 60 * 60 * 1000)
        }
      }
    });
    console.log(`Deleted ${deleteResult.count} old articles`);

    // Store new articles one by one to handle duplicates
    const articles = data.articles.map((article: any) => ({
      title: article.title || 'No Title',
      description: article.description,
      content: article.content,
      url: article.url,
      publishedAt: new Date(article.publishedAt),
      source: article.source?.name || 'Unknown Source',
    }));

    // Create articles one by one, skipping duplicates
    let createdCount = 0;
    for (const article of articles) {
      try {
        await prisma.newsArticle.create({
          data: article
        });
        createdCount++;
      } catch (error) {
        // Skip duplicate entries
        console.log('Skipping duplicate article:', article.title);
      }
    }
    
    console.log(`Stored ${createdCount} new articles`);
    return articles;
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