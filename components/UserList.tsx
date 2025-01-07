'use client';

import { useEffect, useState } from 'react';
import { User } from '@prisma/client';
import { pusherClient, isClient } from '@/lib/pusher';
import UserItem from './UserItem';

interface UserListProps {
  currentUserId: string;
}

export default function UserList({ currentUserId }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!isClient) return;

    // Fetch initial users
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.filter(user => user.id !== currentUserId)));

    // Subscribe to presence channel
    const channel = pusherClient!.subscribe('presence-channel');

    // When a user comes online
    channel.bind('pusher:member_added', (member: { id: string; info: User }) => {
      setUsers(prevUsers => {
        if (prevUsers.find(user => user.id === member.info.id)) return prevUsers;
        return [...prevUsers, member.info];
      });
    });

    // When a user goes offline
    channel.bind('pusher:member_removed', (member: { id: string }) => {
      setUsers(prevUsers => 
        prevUsers.filter(user => user.id !== member.id)
      );
    });

    return () => {
      if (isClient) {
        channel.unbind_all();
        pusherClient!.unsubscribe('presence-channel');
      }
    };
  }, [currentUserId]);

  return (
    <div className="flex flex-col gap-2">
      {users.map(user => (
        <UserItem key={user.id} user={user} />
      ))}
    </div>
  );
} 