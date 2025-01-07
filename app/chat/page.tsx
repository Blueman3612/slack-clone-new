import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { useSearchParams } from "next/navigation";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { channelId: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const { channelId } = searchParams;

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a channel to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <ChatInterface 
        chatId={channelId} 
        chatType="channel"
        currentUserId={session.user.id}
      />
    </div>
  );
} 