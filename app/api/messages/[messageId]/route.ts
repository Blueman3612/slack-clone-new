import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const messageId = params.messageId;
    
    // Get the message and check permissions
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: { role: true }
        }
      }
    });

    if (!message) {
      return new NextResponse("Message not found", { status: 404 });
    }

    // For direct messages, only allow the message owner to delete
    if (message.receiverId) {
      if (message.userId !== session.user.id) {
        return new NextResponse("You can only delete your own messages in direct messages", { status: 403 });
      }
    } else {
      // For channel messages, allow admin or message owner
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      });

      if (message.userId !== session.user.id && user?.role !== "ADMIN") {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Start a transaction to handle all deletion operations
    await prisma.$transaction(async (tx) => {
      // If this is a thread reply, get the parent message to update its count
      if (message.threadId) {
        // Delete the reply
        await tx.message.delete({
          where: { id: messageId }
        });

        // Count remaining replies
        const remainingReplies = await tx.message.count({
          where: { threadId: message.threadId }
        });

        // Trigger thread count update
        await pusherServer.trigger(
          `thread-${message.threadId}`,
          'thread-reply-deleted',
          { replyCount: remainingReplies }
        );
      } else {
        // Delete all replies in the thread first
        await tx.message.deleteMany({
          where: { threadId: messageId }
        });

        // Then delete the parent message
        await tx.message.delete({
          where: { id: messageId }
        });
      }
    });

    // Trigger Pusher event for real-time deletion
    const channelName = message.channelId 
      ? `channel-${message.channelId}`
      : `dm-${[message.userId, message.receiverId].sort().join('-')}`;

    await pusherServer.trigger(channelName, 'message-deleted', {
      messageId: message.id,
      threadDeleted: true
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[MESSAGE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}