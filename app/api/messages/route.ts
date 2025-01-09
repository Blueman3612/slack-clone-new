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
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { content, channelId, receiverId } = body;

    if (!content || (!channelId && !receiverId)) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        ...(channelId ? { channelId } : { receiverId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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
      },
    });

    // Determine channel name based on message type
    const channelName = channelId 
      ? `channel-${channelId}`
      : `dm-${[session.user.id, receiverId].sort().join('-')}`;

    await pusherServer.trigger(channelName, 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 