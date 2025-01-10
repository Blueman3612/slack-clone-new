import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { prisma } from "@/lib/prisma";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const { channelId, userId } = searchParams;

  // Only redirect if there are no search params at all
  if (!channelId && !userId) {
    const generalChannel = await prisma.channel.findFirst({
      where: {
        name: 'general'
      }
    });

    if (generalChannel) {
      redirect(`/chat?channelId=${generalChannel.id}`);
    } else {
      // Fallback to first channel if #general doesn't exist
      const defaultChannel = await prisma.channel.findFirst({
        orderBy: {
          name: 'asc'
        }
      });

      if (defaultChannel) {
        redirect(`/chat?channelId=${defaultChannel.id}`);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  // Fetch messages based on chat type
  const messages = await prisma.message.findMany({
    where: channelId 
      ? {
          channelId,
          threadId: null
        } 
      : {
          AND: [
            { channelId: null },
            { threadId: null },
            {
              OR: [
                {
                  userId: session.user.id,
                  receiverId: userId,
                },
                {
                  userId: userId,
                  receiverId: session.user.id,
                }
              ]
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
    threadMessages: undefined,
  }));

  // Fetch recipient details if this is a DM
  let recipient = null;
  if (userId) {
    recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-800">
      <ChatInterface
        chatId={channelId || userId}
        chatType={channelId ? 'channel' : 'dm'}
        currentUserId={session.user.id}
        initialMessages={messagesWithThreadInfo}
        recipient={recipient}
      />
    </div>
  );
} 