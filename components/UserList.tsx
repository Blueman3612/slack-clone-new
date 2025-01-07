'use client';

import { User } from '@prisma/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pusherClient } from '@/lib/pusher';
import { Members } from 'pusher-js';

interface UserListProps {
  initialUsers: User[];
  currentUserId: string;
}

export default function UserList({ initialUsers, currentUserId }: UserListProps) {
  const [users, setUsers] = useState<{ [key: string]: any }>({});
  const router = useRouter();

  useEffect(() => {
    // Subscribe to presence channel
    const channel = pusherClient.subscribe('presence-users');

    channel.bind('pusher:subscription_succeeded', (members: Members) => {
      console.log('Subscription succeeded with members:', members);
      setUsers(members.members);
    });

    channel.bind('pusher:member_added', (member: any) => {
      console.log('Member added:', member);
      setUsers((currentUsers) => ({
        ...currentUsers,
        [member.id]: member.info
      }));
    });

    channel.bind('pusher:member_removed', (member: any) => {
      console.log('Member removed:', member);
      setUsers((currentUsers) => {
        const newUsers = { ...currentUsers };
        delete newUsers[member.id];
        return newUsers;
      });
    });

    return () => {
      pusherClient.unsubscribe('presence-users');
    };
  }, []);

  const handleUserClick = (userId: string) => {
    if (userId === currentUserId) return;
    router.push(`/chat?userId=${userId}`);
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-white mb-4">Direct Messages</h2>
      <ul>
        {Object.entries(users)
          .filter(([userId]) => userId !== currentUserId)
          .map(([userId, userInfo]: [string, any]) => (
            <li
              key={userId}
              onClick={() => handleUserClick(userId)}
              className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white">{userInfo.name}</span>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
} 