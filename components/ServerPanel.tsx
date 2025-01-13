'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import ServerModal from './modals/ServerModal';

interface Server {
  id: string;
  name: string;
  ownerId: string;
  _count: {
    members: number;
    channels: number;
  };
}

export function ServerPanel() {
  const { data: session } = useSession();
  console.log('Current session:', session);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isJoiningServer, setIsJoiningServer] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (response.ok) {
          const data = await response.json();
          if (isSubscribed) {
            setServers(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      }
    };

    fetchServers();

    return () => {
      isSubscribed = false;
    };
  }, []);

  if (!session?.user) {
    return null;
  }

  const currentServerId = searchParams.get('serverId');

  return (
    <>
      <div className="flex flex-col w-20 bg-gray-950 h-full">
        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Home Button */}
          <div className="relative w-14 h-14">
            <Image
              src="/Acksle Logo.png"
              alt="Home"
              width={30}
              height={30}
              className="object-contain"
            />
          </div>

          <div className="w-14 h-[2px] bg-gray-800 mx-auto my-2" />

          {/* Server List */}
          {servers.map((server) => (
            <button
              key={server.id}
              className={cn(
                "w-14 h-14 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-gray-800 hover:bg-indigo-500",
                currentServerId === server.id && "bg-indigo-500"
              )}
              onClick={() => router.push(`/chat?serverId=${server.id}`)}
            >
              <span className="text-white font-semibold">
                {server.name.substring(0, 2).toUpperCase()}
              </span>
            </button>
          ))}

          {/* Add Server Button */}
          <div className="space-y-2">
            <button 
              className="w-14 h-14 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-gray-800 hover:bg-green-500 group"
              onClick={() => setIsCreatingServer(true)}
            >
              <Plus 
                className="text-green-500 group-hover:text-white transition-colors" 
                size={25} 
              />
            </button>
            <button 
              className="w-14 h-14 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-gray-800 hover:bg-blue-500 group"
              onClick={() => setIsJoiningServer(true)}
            >
              <Plus 
                className="text-blue-500 group-hover:text-white transition-colors rotate-45" 
                size={25} 
              />
            </button>
          </div>
        </div>
      </div>

      <ServerModal 
        isOpen={isCreatingServer} 
        onClose={() => setIsCreatingServer(false)} 
        mode="create"
        onSuccess={(server) => {
          setServers(prev => [...prev, server]);
          router.push(`/chat?serverId=${server.id}`);
        }}
      />

      <ServerModal 
        isOpen={isJoiningServer} 
        onClose={() => setIsJoiningServer(false)} 
        mode="join"
        onSuccess={(server) => {
          setServers(prev => [...prev, server]);
          router.push(`/chat?serverId=${server.id}`);
        }}
      />
    </>
  );
} 