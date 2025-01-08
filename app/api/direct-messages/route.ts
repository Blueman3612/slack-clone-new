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
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    // Verify both users exist
    const [currentUser, otherUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    if (!currentUser || !otherUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: userId,
          },
          {
            senderId: userId,
            receiverId: session.user.id,
          },
        ],
      },
      include: {
        sender: {
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

    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      userId: message.senderId,
      user: message.sender,
      reactions: message.reactions,
      replyCount: 0,
    }));

    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_GET]", error);
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
    const { content, receiverId } = body;

    if (!content || !receiverId) {
      return new NextResponse("Missing content or receiverId", { status: 400 });
    }

    // Verify both users exist
    const [currentUser, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.user.findUnique({ where: { id: receiverId } })
    ]);

    if (!currentUser || !receiver) {
      return new NextResponse("User not found", { status: 404 });
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId,
      },
      include: {
        sender: {
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

    const transformedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      userId: message.senderId,
      user: message.sender,
      reactions: message.reactions,
      replyCount: 0,
    };

    const channelName = `dm-${[session.user.id, receiverId].sort().join('-')}`;
    await pusherServer.trigger(channelName, 'new-message', transformedMessage);

    return NextResponse.json(transformedMessage);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 