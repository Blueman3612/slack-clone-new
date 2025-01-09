import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messageId, emoji, chatType, chatId } = await request.json();
    console.log('Received reaction request:', { messageId, emoji, chatType, chatId });

    if (!messageId || !emoji) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        messageId,
        userId: session.user.id,
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
    console.log('Created reaction:', reaction);

    const channelName = `presence-${chatType}-${chatId}`;
    console.log('Broadcasting to channel:', channelName);

    await pusherServer.trigger(channelName, 'reaction-added', {
      messageId,
      reaction,
    });
    console.log('Broadcasted reaction-added event');

    return NextResponse.json(reaction);
  } catch (error) {
    console.error('Error in reaction POST:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get reactionId from the URL
    const url = new URL(request.url);
    const reactionId = url.searchParams.get('reactionId');
    const { chatType, chatId } = await request.json();

    if (!reactionId) {
      return new NextResponse('Missing reaction ID', { status: 400 });
    }

    // Get the reaction to check ownership and get messageId
    const reaction = await prisma.reaction.findUnique({
      where: { id: reactionId },
      select: { userId: true, messageId: true },
    });

    if (!reaction) {
      return new NextResponse('Reaction not found', { status: 404 });
    }

    // Only allow users to remove their own reactions
    if (reaction.userId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Delete the reaction
    await prisma.reaction.delete({
      where: { id: reactionId },
    });

    // Use consistent channel naming
    const channelName = `presence-${chatType}-${chatId}`;

    // Trigger the reaction-removed event
    await pusherServer.trigger(channelName, 'reaction-removed', {
      messageId: reaction.messageId,
      reactionId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 