import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { content, channelId } = body;

    if (!content || !channelId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get or create user with name
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        name: session.user.name || 'Unknown User',
      },
      create: {
        email: session.user.email,
        name: session.user.name || 'Unknown User',
      },
    });

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        userId: user.id,
        channelId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const transformedMessage = {
      ...message,
      userName: message.user.name || message.user.email?.split('@')[0] || 'Unknown User',
    };

    // Trigger Pusher event
    try {
      await pusher.trigger(
        `presence-channel-${channelId}`,
        'message:new',
        transformedMessage
      );
    } catch (error) {
      console.error('Pusher error:', error);
      // Don't throw here - we still want to return the message even if Pusher fails
    }

    return NextResponse.json(transformedMessage);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return new NextResponse("Missing channelId", { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        parentId: null, // Only get top-level messages
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const transformedMessages = messages.map(message => ({
      ...message,
      userName: message.user.name,
    }));

    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 