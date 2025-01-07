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
    const { content, receiverId } = body;

    if (!content || !receiverId) {
      return new NextResponse("Content and receiverId are required", { status: 400 });
    }

    // Create the direct message
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Trigger Pusher event for DM
    const channelName = `dm-${[session.user.id, receiverId].sort().join('-')}`;
    await pusherServer?.trigger(channelName, 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_POST]", error);
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("UserId is required", { status: 400 });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { senderId: userId, receiverId: session.user.id },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 