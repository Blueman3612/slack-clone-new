import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatSidebar from "@/components/ChatSidebar";
import { ServerPanel } from "@/components/ServerPanel";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex h-screen w-full">
      <ServerPanel />
      <div className="flex flex-1 min-w-0">
        <ChatSidebar />
        {children}
      </div>
    </main>
  );
} 