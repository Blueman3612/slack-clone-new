import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { prisma } from "@/lib/prisma";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { channelId: string; recipientId: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const { channelId, recipientId } = searchParams;

  if (!channelId && !recipientId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a channel or user to start chatting</p>
      </div>
    );
  }

  // Fetch initial messages
  const messages = await prisma.message.findMany({
    where: channelId ? {
      channelId,
      OR: [
        { threadId: null },
        { isThreadStarter: true }
      ]
    } : {
      OR: [
        {
          senderId: session.user.id,
          receiverId: recipientId,
        },
        {
          senderId: recipientId,
          receiverId: session.user.id,
        }
      ]
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
      threadMessages: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Transform messages to include reply count
  const messagesWithThreadInfo = messages.map(message => ({
    ...message,
    replyCount: message.threadMessages.length,
    threadMessages: undefined, // Remove the threadMessages array
  }));

  return (
    <div className="flex-1 bg-white dark:bg-gray-800">
      <ChatInterface
        chatId={channelId || recipientId}
        chatType={channelId ? 'channel' : 'dm'}
        currentUserId={session.user.id}
        initialMessages={messagesWithThreadInfo}
      />
    </div>
  );
} 