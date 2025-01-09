import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { prisma } from "@/lib/prisma";

export default async function DirectMessagePage({
  params
}: {
  params: { userId: string }
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const { userId } = params;

  // Get the other user's details
  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    }
  });

  if (!otherUser) {
    redirect("/chat");
  }

  // Get initial messages
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { userId: session.user.id, receiverId: userId },
        { userId: userId, receiverId: session.user.id }
      ],
      threadId: null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <h2 className="text-lg font-semibold">
          {otherUser.name || otherUser.email}
        </h2>
      </div>
      <ChatInterface
        chatId={userId}
        chatType="dm"
        currentUserId={session.user.id}
        initialMessages={messages}
      />
    </div>
  );
} 