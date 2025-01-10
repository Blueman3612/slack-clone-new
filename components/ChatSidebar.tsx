'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Channel, User } from '@prisma/client';
import Image from 'next/image';
import UserList from './UserList';
import UserStatus from './UserStatus';
import { Plus } from 'lucide-react';
import { useOnlineUsers } from '@/contexts/OnlineUsersContext';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';

export default function ChatSidebar() {
  const { data: session, status } = useSession();
  const { isAdmin } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const currentChannelId = searchParams.get('channelId');
  const currentUserId = searchParams.get('userId');
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const { onlineUsers } = useOnlineUsers();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const filteredUsers = data.filter((user: User) => 
          user.id !== session.user.id
        );
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChannels(data);
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, [session?.user?.id]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create channel');
      }

      const newChannel = await response.json();
      setChannels(prev => [...prev, newChannel]);
      setNewChannelName('');
      setIsCreating(false);
      router.push(`/chat?channelId=${newChannel.id}`);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  if (status === 'loading') {
    return <div className="w-64 bg-gray-900 text-white p-4">Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative w-16 h-16">
            <Image
              src="/Acksle Logo.png"
              alt="Acksle Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-light tracking-wider leading-none" style={{ transform: 'scaleY(2)' }}>
            ACKSLE
          </h1>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Channels</h2>
            {isAdmin && (
              <button
                onClick={() => setIsCreating(true)}
                className="text-gray-400 hover:text-white"
                title="Create Channel"
              >
                <Plus size={20} />
              </button>
            )}
          </div>

          {isCreating && (
            <form onSubmit={handleCreateChannel} className="mb-4">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="New channel name"
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </form>
          )}

          <ul className="space-y-1">
            {channels.map(channel => (
              <li 
                key={channel.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200",
                  currentChannelId === channel.id
                    ? "bg-blue-600/30 border-l-4 border-blue-500"
                    : "hover:bg-gray-700 border-l-4 border-transparent"
                )}
                onClick={() => router.push(`/chat?channelId=${channel.id}`)}
              >
                <span className={cn(
                  "text-sm transition-colors duration-200",
                  currentChannelId === channel.id ? "text-blue-400" : "text-gray-300"
                )}>#</span>
                <span className={cn(
                  "text-sm transition-colors duration-200",
                  currentChannelId === channel.id ? "text-blue-400" : "text-white"
                )}>
                  {channel.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <UserList
          initialUsers={users}
          currentUserId={session?.user?.id || ''}
          onUserClick={(userId) => router.push(`/chat?userId=${userId}`)}
          selectedUserId={currentUserId}
          onlineUsers={onlineUsers}
        />
      </div>

      <UserStatus />
    </div>
  );
} 