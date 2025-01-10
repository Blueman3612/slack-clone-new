import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { prisma } from "@/lib/prisma";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  // Access searchParams directly instead of using URLSearchParams
  const channelId = searchParams.channelId;
  const recipientId = searchParams.recipientId;

  // Only redirect if there are no search params
  if (!channelId && !recipientId) {
    const generalChannel = await prisma.channel.findFirst({
      where: {
        name: 'general'
      }
    });

    if (generalChannel) {
      redirect(`/chat?channelId=${generalChannel.id}`);
    }
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
                  receiverId: recipientId,
                },
                {
                  userId: recipientId,
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
  if (recipientId) {
    recipient = await prisma.user.findUnique({
      where: { id: recipientId },
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
        chatId={channelId || recipientId}
        chatType={channelId ? 'channel' : 'dm'}
        currentUserId={session.user.id}
        initialMessages={messagesWithThreadInfo}
        recipient={recipient}
      />
    </div>
  );
} 