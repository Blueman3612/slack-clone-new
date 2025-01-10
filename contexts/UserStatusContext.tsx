'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';

interface UserStatus {
  emoji?: string;
  text?: string;
}

interface UserStatuses {
  [userId: string]: UserStatus | null;
}

interface UserStatusContextType {
  statuses: UserStatuses;
  fetchStatus: (userId: string) => Promise<void>;
}

const UserStatusContext = createContext<UserStatusContextType | null>(null);

export function UserStatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<UserStatuses>({});

  const fetchStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/${userId}/status`);
      if (response.ok) {
        const status = await response.json();
        setStatuses(prev => ({
          ...prev,
          [userId]: status
        }));
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  };

  useEffect(() => {
    const channel = pusherClient.subscribe('user-status');

    channel.bind('status-update', (data: { 
      userId: string;
      status: UserStatus | null;
    }) => {
      setStatuses(prev => ({
        ...prev,
        [data.userId]: data.status
      }));
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe('user-status');
    };
  }, []);

  return (
    <UserStatusContext.Provider value={{ statuses, fetchStatus }}>
      {children}
    </UserStatusContext.Provider>
  );
}

export function useUserStatus() {
  const context = useContext(UserStatusContext);
  if (!context) {
    throw new Error('useUserStatus must be used within a UserStatusProvider');
  }
  return context;
} 