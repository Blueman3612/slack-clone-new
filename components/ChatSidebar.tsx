'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Channel, User } from '@prisma/client';
import UserList from './UserList';

export default function ChatSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const currentChannelId = searchParams.get('channelId');
  const currentUserId = searchParams.get('userId');

  useEffect(() => {
    // Fetch channels
    fetch('/api/channels')
      .then(res => res.json())
      .then(data => setChannels(data))
      .catch(err => console.error('Error fetching channels:', err));

    // Fetch users
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Error fetching users:', err));
  }, []);

  const handleChannelClick = (channelId: string) => {
    router.push(`/chat?channelId=${channelId}`);
  };

  const handleUserClick = (userId: string) => {
    router.push(`/chat?userId=${userId}`);
  };

  if (!session?.user) return null;

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Channels</h2>
        <ul>
          {channels.map(channel => (
            <li 
              key={channel.id}
              className={`
                cursor-pointer p-2 rounded
                ${currentChannelId === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'}
              `}
              onClick={() => handleChannelClick(channel.id)}
            >
              # {channel.name}
            </li>
          ))}
        </ul>
      </div>

      <UserList
        initialUsers={users}
        currentUserId={session.user.id}
        onUserClick={handleUserClick}
        selectedUserId={currentUserId}
      />
    </div>
  );
} 