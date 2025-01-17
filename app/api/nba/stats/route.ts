import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRecentGames } from '@/lib/nba-stats';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'games') {
      const games = await getRecentGames();
      console.log(`Fetched ${games.length} games`);
      
      // Return the games in an object with a games property
      return NextResponse.json({ games });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error('Error in NBA stats route:', error);
    return NextResponse.json(
      { error: "Failed to fetch NBA stats" },
      { status: 500 }
    );
  }
} 