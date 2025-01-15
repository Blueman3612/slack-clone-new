'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from "@prisma/client";
import { cn } from "@/lib/utils";
import StatusTooltip from './StatusTooltip';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { Shield, Bot } from 'lucide-react';

interface UserListProps {
  currentUserId: string;
  initialUsers?: (User & { role?: string })[];
  onUserClick: (userId: string) => void;
  selectedUserId: string | null;
  onlineUsers?: Set<string>;
  notifications?: { [key: string]: { count: number; hasUnread: boolean; hasMention: boolean } };
}

const ADMIN_USER_ID = 'cm5ug4h3p0000uj6s1itvm3p7';
const TEST_USER_ID = 'cm5ug4hpp0004uj6spjcdf6sw';

export default function UserList({ 
  currentUserId, 
  initialUsers = [], 
  onUserClick,
  selectedUserId,
  onlineUsers = new Set(),
  notifications = {}
}: UserListProps) {
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const userRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { statuses, fetchStatus } = useUserStatus();

  useEffect(() => {
    let isSubscribed = true;
    const usersToFetch = initialUsers.filter(user => !statuses[user.id]);

    const fetchStatuses = async () => {
      // Fetch in batches with delay to prevent rate limiting
      for (let i = 0; i < usersToFetch.length; i++) {
        if (!isSubscribed) break;
        
        const user = usersToFetch[i];
        if (!statuses[user.id]) {
          try {
            await fetchStatus(user.id);
            // Add a 500ms delay between requests
            if (i < usersToFetch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error: any) {
            // If we hit rate limit, wait longer before retrying
            if (error?.response?.status === 429) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              i--; // Retry this user
            }
          }
        }
      }
    };

    if (usersToFetch.length > 0) {
      fetchStatuses();
    }

    return () => {
      isSubscribed = false;
    };
  }, [initialUsers, fetchStatus, statuses]);

  const filteredUsers = initialUsers.filter(user => {
    return user.isAI || (
      user.id !== ADMIN_USER_ID && 
      user.id !== TEST_USER_ID
    );
  });

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
      {filteredUsers.map((user) => {
        const notificationKey = `dm-${user.id}`;
        const notification = notifications[notificationKey];
        
        return (
          <button
            key={user.id}
            onClick={() => onUserClick(user.id)}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-200",
              selectedUserId === user.id 
                ? "bg-blue-600/30 border-l-4 border-blue-500" 
                : "hover:bg-gray-700 border-l-4 border-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 flex items-center justify-center">
                {user.isAI === true ? (
                  <Bot className="w-3 h-3 text-blue-500" />
                ) : (
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    onlineUsers.has(user.id) ? "bg-green-500" : "bg-gray-500"
                  )} />
                )}
              </div>
              <div 
                ref={el => userRefs.current[user.id] = el}
                className="relative flex items-center gap-2"
                onMouseEnter={() => setHoveredUserId(user.id)}
                onMouseLeave={() => setHoveredUserId(null)}
              >
                <div className="relative">
                  <img
                    src={user.image || '/default-avatar.png'}
                    alt={user.name || "User"}
                    className="w-6 h-6 rounded-full"
                  />
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className={cn(
                    "text-sm truncate transition-colors duration-200",
                    notification?.hasUnread ? "font-bold" : "font-normal",
                    selectedUserId === user.id ? "text-blue-400" : "text-gray-300"
                  )}>
                    {user.name || user.email}
                  </span>
                  {user.role === 'ADMIN' && (
                    <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" aria-label="Admin" />
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
            </div>
            {notification?.count > 0 && (
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-full",
                notification.hasMention ? "bg-red-500" : "bg-gray-600"
              )}>
                {notification.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
} 