'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Channel, User } from '@prisma/client';
import UserList from './UserList';

export default function ChatSidebar() {
  console.log('ChatSidebar rendering'); // Debug log

  const { data: session, status } = useSession();
  console.log('Session status:', status, 'Session:', session); // Debug log

  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const currentChannelId = searchParams.get('channelId');
  const currentRecipientId = searchParams.get('recipientId');

  // Separate useEffect for users with immediate invocation
  useEffect(() => {
    console.log('Users useEffect triggered'); // Debug log

    const fetchUsers = async () => {
      if (!session?.user?.id) {
        console.log('No session user ID available'); // Debug log
        return;
      }

      console.log('Fetching users for session ID:', session.user.id); // Debug log
      
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store'
        });

        console.log('Users API response status:', response.status); // Debug log

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Users data received:', data); // Debug log

        if (!Array.isArray(data)) {
          console.error('Received data is not an array:', data);
          return;
        }

        const filteredUsers = data.filter((user: User) => 
          user.id !== session.user.id
        );
        console.log('Filtered users:', filteredUsers); // Debug log
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [session?.user?.id, status]);

  // Separate useEffect for channels
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

  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId);
    router.push(`/chat?recipientId=${userId}`);
  };

  if (status === 'loading') {
    return <div className="w-64 bg-gray-800 text-white p-4">Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      {/* Debug info at the top */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 text-xs text-gray-500">
          <p>Session status: {status}</p>
          <p>Session user: {session?.user?.id}</p>
          <p>Users count: {users.length}</p>
        </div>
      )}

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
        currentUserId={session?.user?.id || ''}
        onUserClick={(userId) => router.push(`/chat?recipientId=${userId}`)}
        selectedUserId={currentRecipientId}
      />
    </div>
  );
} 