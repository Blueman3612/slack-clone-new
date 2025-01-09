import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const replies = await prisma.message.findMany({
      where: {
        threadId: params.messageId,
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

    return NextResponse.json(replies);
  } catch (error) {
    console.error("[THREAD_MESSAGES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return new NextResponse("Content is required", { status: 400 });
    }

    // Get the parent message to check channel
    const parentMessage = await prisma.message.findUnique({
      where: { id: params.messageId },
      select: {
        channelId: true,
        userId: true,
      },
    });

    if (!parentMessage) {
      return new NextResponse("Parent message not found", { status: 404 });
    }

    const reply = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        channelId: parentMessage.channelId,
        threadId: params.messageId,
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
      },
    });

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(`channel-${parentMessage.channelId}`, 'thread-reply', {
      messageId: params.messageId,
      reply,
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error("[THREAD_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 