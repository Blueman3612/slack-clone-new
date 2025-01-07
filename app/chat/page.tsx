import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const channelId = searchParams.channelId as string;
  const userId = searchParams.userId as string;

  return (
    <div className="flex h-screen">
      <Sidebar currentUser={session.user} />
      <div className="flex-1">
        <ChatInterface 
          initialChannelId={channelId} 
          initialUserId={userId} 
          currentUser={session.user} 
        />
      </div>
    </div>
  );
} 