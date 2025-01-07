import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";

interface DirectMessagePageProps {
  params: {
    userId: string;
  };
}

export default async function DirectMessagePage({ params }: DirectMessagePageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col">
      <ChatInterface 
        chatId={params.userId} 
        chatType="dm"
        currentUserId={session.user.id}
      />
    </div>
  );
} 