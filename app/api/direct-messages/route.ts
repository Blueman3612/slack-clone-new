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
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { content, receiverId } = body;

    console.log('Received request with body:', body);

    if (!content || !receiverId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get or create sender
    const sender = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || 'Unknown User',
      },
    });

    console.log('Sender found/created:', sender);

    // Find receiver
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    console.log('Receiver lookup result:', receiver);

    if (!receiver) {
      console.log('Receiver not found:', receiverId);
      return new NextResponse("Receiver not found", { status: 404 });
    }

    // Create the direct message
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: sender.id,
        receiverId: receiver.id,
      },
      include: {
        sender: {
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
      senderName: message.sender.name,
    };

    // Trigger for both users' channels
    const channelName = `private-dm-${sender.id}-${receiver.id}`;
    const reverseChannelName = `private-dm-${receiver.id}-${sender.id}`;
    
    await pusher.trigger([channelName, reverseChannelName], 'message:new', transformedMessage);

    return NextResponse.json(transformedMessage);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 