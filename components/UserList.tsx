'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from "@prisma/client";
import { cn } from "@/lib/utils";
import StatusTooltip from './StatusTooltip';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { Shield } from 'lucide-react';

interface UserListProps {
  currentUserId: string;
  initialUsers?: (User & { role?: string })[];
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

  useEffect(() => {
    initialUsers.forEach(user => {
      if (!statuses[user.id]) {
        fetchStatus(user.id);
      }
    });
  }, [initialUsers, fetchStatus, statuses]);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
      {initialUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserClick(user.id)}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-all duration-200",
            selectedUserId === user.id 
              ? "bg-blue-600/30 border-l-4 border-blue-500" 
              : "hover:bg-gray-700 border-l-4 border-transparent"
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
                className={cn(
                  "w-6 h-6 rounded-full transition-transform duration-200",
                  selectedUserId === user.id && "scale-110"
                )}
              />
            ) : (
              <div className={cn(
                "w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 transition-transform duration-200",
                selectedUserId === user.id && "scale-110"
              )} />
            )}
            <div className="flex items-center gap-1 min-w-0">
              <span className={cn(
                "text-sm truncate transition-colors duration-200",
                selectedUserId === user.id ? "text-blue-400" : "text-gray-300"
              )}>
                {user.name || user.email}
              </span>
              {user.role === 'ADMIN' && (
                <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" title="Admin" />
              )}
            </div>
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