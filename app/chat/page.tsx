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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  // Ensure user exists in database
  const user = await prisma.user.upsert({
    where: { 
      id: session.user.id 
    },
    update: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image
    },
    create: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: 'USER'
    }
  });

  // Await the searchParams
  const params = await Promise.resolve(searchParams);
  const { channelId, userId } = params;

  // Only redirect if there are no search params at all
  if (!channelId && !userId) {
    // Find the general channel
    const generalChannel = await prisma.channel.findFirst({
      where: {
        name: 'general'
      },
      include: {
        server: {
          include: {
            members: true
          }
        }
      }
    });

    if (!generalChannel) {
      console.error('No general channel found');
      return <div>Error: No general channel found. Please contact administrator.</div>;
    }

    // Verify user is a member of the server
    const isMember = generalChannel.server.members.some(member => member.id === user.id);
    if (!isMember) {
      console.log('Adding user to server:', {
        userId: user.id,
        serverId: generalChannel.server.id
      });

      // Add user to server
      await prisma.server.update({
        where: { 
          id: generalChannel.server.id 
        },
        data: {
          members: {
            connect: { 
              id: user.id 
            }
          }
        }
      });
    }

    redirect(`/chat?channelId=${generalChannel.id}`);
  }

  return (
    <ChatInterface 
      chatId={channelId || userId || ''} 
      chatType={channelId ? 'channel' : 'dm'}
      currentUserId={user.id}
      initialMessages={[]}
    />
  );
} 