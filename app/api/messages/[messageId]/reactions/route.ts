import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

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
    const { emoji, chatType, chatId } = body;
    const messageId = params.messageId;

    if (!emoji) {
      return new NextResponse("Emoji is required", { status: 400 });
    }

    // First check if the message exists and get its type
    const message = await prisma.message.findUnique({
      where: { id: params.messageId },
      select: {
        id: true,
        channelId: true,
        userId: true,
        receiverId: true,
        threadId: true,
      }
    });

    if (!message) {
      return new NextResponse("Message not found", { status: 404 });
    }

    // Create or remove reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: params.messageId,
        userId: session.user.id,
        emoji,
      },
    });

    let reaction;
    if (existingReaction) {
      // Remove reaction if it already exists
      reaction = await prisma.reaction.delete({
        where: {
          id: existingReaction.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
    } else {
      // Create new reaction
      reaction = await prisma.reaction.create({
        data: {
          emoji,
          userId: session.user.id,
          messageId: params.messageId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
    }

    // Get updated message with reactions
    const updatedMessage = await prisma.message.findUnique({
      where: {
        id: params.messageId,
      },
      include: {
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

    if (updatedMessage) {
      // Determine if the message is part of a thread
      const isThreadMessage = Boolean(message.threadId);
      
      // Use the thread's parent message ID as chatId if it's a thread message
      const effectiveChatId = isThreadMessage ? message.threadId : chatId;
      const effectiveChatType = isThreadMessage ? 'thread' : chatType;
      
      const channelName = `presence-${effectiveChatType}-${effectiveChatId}`;
      
      await pusherServer.trigger(channelName, 'message-reaction', {
        messageId: messageId,
        reaction: reaction || existingReaction,
        type: existingReaction ? 'remove' : 'add'
      });

      // If it's a thread message, also trigger on the thread-specific channel
      if (isThreadMessage) {
        await pusherServer.trigger(`thread-${message.threadId}`, 'message-reaction', {
          messageId: messageId,
          reaction: reaction || existingReaction,
          type: existingReaction ? 'remove' : 'add'
        });
      }
    }

    return NextResponse.json(reaction || existingReaction);
  } catch (error) {
    console.error("[MESSAGE_REACTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const reactions = await prisma.reaction.findMany({
      where: {
        messageId: params.messageId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("[REACTIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 