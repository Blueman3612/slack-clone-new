import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChannelList from "@/components/ChannelList";
import UserList from "@/components/UserList";

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
    <main className="flex h-screen">
      <div className="w-64 bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
        <div className="flex-1">
          <h2 className="text-2xl font-light mb-4 text-gray-900 dark:text-white tracking-wide uppercase font-['Inter']">
            Acksle
          </h2>
          <ChannelList />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Direct Messages</h2>
          <UserList currentUserId={session.user.id} />
        </div>
      </div>
      {children}
    </main>
  );
} 