import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return new NextResponse("Missing channelId", { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform messages to include user info
    const transformedMessages = messages.map(message => ({
      ...message,
      senderName: message.user.name,
      senderId: message.user.id,
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
    const { content, channelId } = body;

    if (!content) {
      return new NextResponse("Missing content", { status: 400 });
    }

    if (!channelId) {
      return new NextResponse("Missing channelId", { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        userId: session.user.id,
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

    // Transform message to include user info
    const transformedMessage = {
      ...message,
      senderName: message.user.name,
      senderId: message.user.id,
    };

    // Trigger Pusher event with the channel prefix
    const channelName = `presence-channel-${channelId}`;
    await pusher.trigger(channelName, 'message:new', transformedMessage);

    return NextResponse.json(transformedMessage);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 