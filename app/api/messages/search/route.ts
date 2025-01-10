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

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    // First get all channels the user has access to
    const [userChannels, publicChannels] = await Promise.all([
      // Get user's joined channels
      prisma.channel.findMany({
        where: {
          members: {
            some: {
              id: session.user.id
            }
          }
        },
        select: { id: true }
      }),
      // Get all channels (for admins) or public channels (for regular users)
      prisma.channel.findMany({
        where: {
          OR: [
            {
              name: {
                not: 'admins-only' // Exclude admin channel for non-admins
              }
            },
            {
              AND: [
                { name: 'admins-only' },
                {
                  members: {
                    some: {
                      id: session.user.id,
                      role: 'ADMIN'
                    }
                  }
                }
              ]
            }
          ]
        },
        select: { id: true }
      })
    ]);

    // Combine channel IDs
    const accessibleChannelIds = [...new Set([
      ...userChannels.map(c => c.id),
      ...publicChannels.map(c => c.id)
    ])];

    // Search for messages
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          {
            content: {
              contains: query.toLowerCase()
            }
          },
          {
            OR: [
              { channelId: { in: accessibleChannelIds } },
              {
                AND: [
                  { channelId: null },
                  {
                    OR: [
                      { userId: session.user.id },
                      { receiverId: session.user.id }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 50
    });

    // Group messages by channel/DM with improved sorting
    const groupedMessages = messages.reduce((acc, message) => {
      const key = message.channelId 
        ? `channel:${message.channelId}` 
        : `dm:${message.receiverId || message.userId}`;
      
      if (!acc[key]) {
        acc[key] = {
          type: message.channelId ? 'channel' : 'dm',
          name: message.channelId 
            ? message.channel?.name 
            : message.receiverId === session.user.id
              ? message.user.name
              : message.receiver?.name,
          messages: []
        };
      }
      
      acc[key].messages.push(message);
      return acc;
    }, {} as Record<string, { type: 'channel' | 'dm', name: string, messages: typeof messages }>);

    // Convert to array and sort by message count and name
    const sortedGroups = Object.entries(groupedMessages)
      .map(([key, group]) => ({
        key,
        ...group,
        messageCount: group.messages.length
      }))
      .sort((a, b) => {
        // First sort by message count (descending)
        if (b.messageCount !== a.messageCount) {
          return b.messageCount - a.messageCount;
        }
        // Then sort alphabetically by name, handling undefined names
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });

    return NextResponse.json(sortedGroups);

  } catch (error) {
    console.error('[SEARCH_ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 