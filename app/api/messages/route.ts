import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { content, channelId } = body;

    if (!content || !channelId) {
      return new NextResponse("Missing content or channelId", { status: 400 });
    }

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        channelId,
      },
      include: {
        user: true,
      },
    });

    // Trigger Pusher event
    await pusherServer.trigger(`channel-${channelId}`, 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return new NextResponse("Channel ID required", { status: 400 });
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
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 