import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const receiverId = searchParams.get("receiverId");

    if (!channelId && !receiverId) {
      return new NextResponse("Channel ID or Receiver ID required", { status: 400 });
    }

    // Query based on message type
    const messages = await prisma.message.findMany({
      where: channelId ? {
        channelId: channelId,
        threadId: null, // Only get main messages, not replies
      } : {
        OR: [
          {
            userId: session.user.id,
            receiverId: receiverId,
            threadId: null,
          },
          {
            userId: receiverId,
            receiverId: session.user.id,
            threadId: null,
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
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
        createdAt: 'asc',
      },
    });

    const transformedMessages = messages.map(message => ({
      ...message,
      replyCount: message.threadMessages.length,
      isThreadStarter: message.threadMessages.length > 0
    }));

    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, channelId, receiverId, userId } = body;

    console.log('Message creation attempt:', { content, channelId, receiverId, userId });

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Use provided userId (for Blueman responses) or session user id
    const messageUserId = userId || session.user.id;

    // Verify user exists (either sender or Blueman)
    const user = await prisma.user.findUnique({
      where: { id: messageUserId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Keep all existing verification logic
    if (channelId) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId }
      });
      
      if (!channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }
    }

    if (receiverId) {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId }
      });

      if (!receiver) {
        return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
      }
    }

    // Create message with proper data structure
    const messageData = {
      content: content.trim(),
      userId: messageUserId, // Use the determined userId
      isThreadStarter: false,
      replyCount: 0,
      ...(channelId ? { channelId } : {}),
      ...(receiverId ? { receiverId } : {})
    };

    console.log('Creating message with data:', messageData);

    const message = await prisma.message.create({
      data: messageData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Trigger Pusher event for real-time updates
    const channelName = channelId 
      ? `channel-${channelId}`
      : `dm-${[session.user.id, receiverId].sort().join('-')}`;

    await pusherServer.trigger(channelName, 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 