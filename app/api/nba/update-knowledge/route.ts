import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateNBAKnowledge } from '@/lib/nba-knowledge';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await updateNBAKnowledge();
    return NextResponse.json({ 
      message: 'NBA knowledge updated successfully',
      gamesProcessed: results.length
    });
  } catch (error) {
    console.error('Error updating NBA knowledge:', error);
    return NextResponse.json(
      { error: 'Failed to update NBA knowledge' },
      { status: 500 }
    );
  }
} 