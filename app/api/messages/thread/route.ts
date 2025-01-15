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
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return new NextResponse("Thread ID required", { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        threadId: threadId,
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[THREAD_MESSAGES_GET]", error);
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
    const { content, threadId } = body;

    if (!content || !threadId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get the parent message to check channel
    const parentMessage = await prisma.message.findUnique({
      where: { id: threadId },
      select: {
        channelId: true,
        userId: true,
      },
    });

    if (!parentMessage) {
      return new NextResponse("Parent message not found", { status: 404 });
    }

    // Create reply first
    const reply = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        channelId: parentMessage.channelId,
        threadId: threadId,
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

    // Get thread count
    const threadCount = await prisma.message.count({
      where: { threadId }
    });

    // Update parent message's thread messages count
    await prisma.$executeRaw`UPDATE Message SET replyCount = ${threadCount} WHERE id = ${threadId}`;

    // Trigger real-time updates
    const threadChannel = `presence-thread-${threadId}`;
    const mainChannel = parentMessage.channelId 
      ? `presence-channel-${parentMessage.channelId}`
      : `presence-dm-${[session.user.id, parentMessage.userId].sort().join('-')}`;

    // Send new message to thread channel
    await pusherServer.trigger(threadChannel, 'new-message', reply);
    
    // Send thread update to main channel (only update the thread count)
    await pusherServer.trigger(mainChannel, 'thread-update', {
      messageId: threadId,
      replyCount: threadCount,
      lastReply: {
        content: reply.content,
        user: reply.user,
        createdAt: reply.createdAt
      }
    });

    return NextResponse.json({ ...reply, replyCount: threadCount });
  } catch (error) {
    console.error("[THREAD_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 