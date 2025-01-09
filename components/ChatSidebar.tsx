'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Channel, User } from '@prisma/client';
import UserList from './UserList';

export default function ChatSidebar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const currentChannelId = searchParams.get('channelId');
  const currentRecipientId = searchParams.get('recipientId');

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

  if (status === 'loading') {
    return <div className="w-64 bg-gray-800 text-white p-4">Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h1 className="text-2xl font-light tracking-wider mb-8">ACKSLE</h1>
      
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
              onClick={() => router.push(`/chat?channelId=${channel.id}`)}
            >
              # {channel.name}
            </li>
          ))}
        </ul>
      </div>

      <UserList
        initialUsers={users}
        currentUserId={session.user.id}
        onUserClick={(userId) => router.push(`/chat?recipientId=${userId}`)}
        selectedUserId={currentRecipientId}
      />
    </div>
  );
} 