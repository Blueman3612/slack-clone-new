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
    const { emoji } = body;

    if (!emoji) {
      return new NextResponse("Emoji is required", { status: 400 });
    }

    // First check if the message exists
    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
    });

    if (!message) {
      return new NextResponse("Message not found", { status: 404 });
    }

    // Create or remove reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        directMessageId: params.messageId,
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
          directMessageId: params.messageId,
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
    const updatedMessage = await prisma.directMessage.findUnique({
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
      const channelName = `dm-${[message.senderId, message.receiverId].sort().join('-')}`;
      await pusherServer.trigger(channelName, 'message-reaction', {
        messageId: params.messageId,
        reaction: reaction,
        type: existingReaction ? 'remove' : 'add',
      });
    }

    return NextResponse.json(reaction);
  } catch (error) {
    console.error("[DM_REACTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 