import { NextResponse } from 'next/server';
import { fetchAndStoreNBANews } from '@/lib/news-fetcher';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to verify cron secret
const isValidCronRequest = (request: Request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  // The token should be: Bearer <CRON_SECRET>
  const [bearer, token] = authHeader.split(' ');
  return bearer === 'Bearer' && token === process.env.CRON_SECRET;
};

// POST - Manual trigger (admin only)
export async function POST() {
  try {
    console.log('Starting manual news fetch...');
    const session = await getServerSession(authOptions);
    
    console.log('Session:', {
      user: session?.user?.name,
      role: session?.user?.role
    });

    if (!session?.user || session.user.role !== 'ADMIN') {
      console.log('Unauthorized attempt to fetch news');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const articles = await fetchAndStoreNBANews();
    console.log(`Successfully fetched and stored ${articles.length} articles`);
    return NextResponse.json({ success: true, count: articles.length });
  } catch (error) {
    console.error('Detailed error in news fetch route:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET - Cron job trigger
export async function GET(request: Request) {
  try {
    console.log('Starting cron news fetch...');
    
    if (!isValidCronRequest(request)) {
      console.log('Unauthorized cron attempt');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const articles = await fetchAndStoreNBANews();
    console.log(`Successfully fetched and stored ${articles.length} articles`);
    return NextResponse.json({ success: true, count: articles.length });
  } catch (error) {
    console.error('Detailed error in news fetch route:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 