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

    const { content, threadId, chatId, chatType } = await request.json();

    // Use a transaction to ensure both operations complete
    const result = await prisma.$transaction(async (tx) => {
      // Create the reply
      const reply = await tx.message.create({
        data: {
          content,
          userId: session.user.id,
          threadId,
          ...(chatType === 'channel' ? { channelId: chatId } : {}),
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
        },
      });

      // Update the parent message to mark it as a thread starter
      await tx.message.update({
        where: { id: threadId },
        data: {
          isThreadStarter: true,
        }
      });

      return reply;
    });

    // Trigger real-time updates
    const channelName = chatType === 'channel'
      ? `thread-channel-${chatId}-${threadId}`
      : `thread-dm-${chatId}-${threadId}`;

    await pusherServer.trigger(channelName, 'new-reply', result);

    // Get updated thread count
    const threadCount = await prisma.message.count({
      where: { threadId: threadId }
    });

    // Update thread count in main chat
    const mainChannelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${chatId}`;

    await pusherServer.trigger(mainChannelName, 'update-thread', {
      messageId: threadId,
      replyCount: threadCount,
      isThreadStarter: true
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[THREAD_REPLY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 