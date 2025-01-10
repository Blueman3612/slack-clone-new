'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from "@prisma/client";
import { cn } from "@/lib/utils";
import StatusTooltip from './StatusTooltip';
import { useUserStatus } from '@/contexts/UserStatusContext';

interface UserListProps {
  currentUserId: string;
  initialUsers?: User[];
  onUserClick: (userId: string) => void;
  selectedUserId: string | null;
  onlineUsers?: Set<string>;
}

export default function UserList({ 
  currentUserId, 
  initialUsers = [], 
  onUserClick,
  selectedUserId,
  onlineUsers = new Set()
}: UserListProps) {
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const userRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { statuses, fetchStatus } = useUserStatus();

  // Replace the status fetching effect with this one
  useEffect(() => {
    initialUsers.forEach(user => {
      if (!statuses[user.id]) {
        fetchStatus(user.id);
      }
    });
  }, [initialUsers, fetchStatus, statuses]);

  // Remove the old Pusher subscription since it's now handled by the context

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
      {initialUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserClick(user.id)}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors",
            selectedUserId === user.id && "bg-gray-700"
          )}
        >
          <div className={cn(
            "w-3 h-3 rounded-full",
            onlineUsers.has(user.id) ? "bg-green-500" : "bg-gray-500"
          )} />
          <div 
            ref={el => userRefs.current[user.id] = el}
            className="relative flex items-center gap-2"
            onMouseEnter={() => setHoveredUserId(user.id)}
            onMouseLeave={() => setHoveredUserId(null)}
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700" />
            )}
            <span className="text-sm text-gray-300 truncate">
              {user.name || user.email}
            </span>
            {hoveredUserId === user.id && statuses[user.id] && userRefs.current[user.id] && (
              <StatusTooltip 
                emoji={statuses[user.id]?.emoji} 
                text={statuses[user.id]?.text}
                targetRef={userRefs.current[user.id]!}
              />
            )}
          </div>
        </button>
      ))}
    </div>
  );
} 