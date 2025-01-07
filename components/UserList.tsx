'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';
import Link from 'next/link';
import { User } from '@prisma/client';

interface UserListProps {
  currentUser?: User | null;
}

export default function UserList({ currentUser }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!currentUser) return; // Don't subscribe if there's no current user

    // Subscribe to presence channel for users
    const channel = pusherClient.subscribe('presence-users');

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('Users subscription succeeded:', members);
      const initialUsers = Object.values(members.members).map((member: any) => ({
        id: member.id,
        name: member.name,
        email: member.email,
      }));
      setUsers(initialUsers);
    });

    channel.bind('pusher:member_added', (member: any) => {
      console.log('Member added:', member);
      setUsers(prev => [...prev, {
        id: member.id,
        name: member.info.name,
        email: member.info.email,
      }]);
    });

    channel.bind('pusher:member_removed', (member: any) => {
      console.log('Member removed:', member);
      setUsers(prev => prev.filter(user => user.id !== member.id));
    });

    // Cleanup on unmount
    return () => {
      pusherClient.unsubscribe('presence-users');
    };
  }, [currentUser]); // Add currentUser to dependency array

  // Filter out the current user from the list, with null check
  const otherUsers = currentUser 
    ? users.filter(user => user.id !== currentUser.id)
    : users;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Direct Messages</h2>
        {otherUsers.length === 0 ? (
          <p className="text-gray-500 text-sm">No other users online</p>
        ) : (
          <ul className="space-y-2">
            {otherUsers.map(user => (
              <li key={user.id}>
                <Link
                  href={`/chat?userId=${user.id}`}
                  className="text-blue-500 hover:text-blue-700"
                >
                  {user.name || user.email?.split('@')[0] || 'Unknown User'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 