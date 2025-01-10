import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const channelId = searchParams.get('channelId');
    const receiverId = searchParams.get('receiverId');

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const whereClause = {
      AND: [
        {
          content: {
            contains: query,
          },
        },
        channelId ? { channelId } : receiverId ? { receiverId } : {},
      ],
    };

    console.log('Search query:', { query, channelId, receiverId, whereClause });

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        threadMessages: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const messagesWithThreadInfo = messages.map(message => ({
      ...message,
      replyCount: message.threadMessages.length,
      threadMessages: undefined,
    }));

    console.log(`Found ${messagesWithThreadInfo.length} messages`);
    return NextResponse.json(messagesWithThreadInfo);

  } catch (error) {
    console.error('[SEARCH_ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 