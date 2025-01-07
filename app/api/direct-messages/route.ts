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
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { senderId: userId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
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

    // Transform messages to include correct user info
    const transformedMessages = messages.map(message => ({
      ...message,
      user: message.sender, // Keep sender info for display
      senderName: message.sender.name,
      receiverName: message.receiver.name,
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
    const { content, userId } = body;

    if (!content) {
      return new NextResponse("Missing content", { status: 400 });
    }

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Transform message to include correct user info
    const transformedMessage = {
      ...message,
      user: message.sender,
      senderName: message.sender.name,
      receiverName: message.receiver.name,
    };

    // Get channel name in consistent order
    const [id1, id2] = [session.user.id, userId].sort();
    const channelName = `private-dm-${id1}-${id2}`;
    
    await pusher.trigger(channelName, 'message:new', transformedMessage);

    return NextResponse.json(transformedMessage);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 