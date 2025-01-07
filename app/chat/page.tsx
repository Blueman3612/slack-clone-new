import ChatInterface from "@/components/ChatInterface";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { channelId?: string; userId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className="h-full">
      <ChatInterface 
        channelId={searchParams.channelId} 
        userId={searchParams.userId}
        currentUser={session.user}
      />
    </div>
  );
} 