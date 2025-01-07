'use client';

import { useState, useEffect } from 'react';
import { User } from '@prisma/client';

interface DirectMessagesListProps {
  activeUserId?: string;
  currentUserId: string;
  onUserSelect: (user: User) => void;
}

export function DirectMessagesList({ activeUserId, currentUserId, onUserSelect }: DirectMessagesListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        // Filter out the current user
        setUsers(data.filter((user: User) => user.id !== currentUserId));
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
      <ul className="space-y-1">
        {users.map((user) => (
          <li 
            key={user.id}
            className={`
              cursor-pointer p-2 rounded flex items-center space-x-2
              ${activeUserId === user.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}
            `}
            onClick={() => onUserSelect(user)}
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{user.name || 'Anonymous'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 