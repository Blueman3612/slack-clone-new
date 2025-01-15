'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePusher } from './PusherContext';

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
  const [lastFetch, setLastFetch] = useState<{[userId: string]: number}>({});
  const { subscribeToChannel, unsubscribeFromChannel } = usePusher();

  const fetchStatus = async (userId: string) => {
    // Check if we've fetched this status recently (within last 30 seconds)
    const now = Date.now();
    if (lastFetch[userId] && now - lastFetch[userId] < 30000) {
      return;
    }

    try {
      const response = await fetch(`/api/user/${userId}/status`);
      if (response.ok) {
        const status = await response.json();
        setStatuses(prev => ({
          ...prev,
          [userId]: status
        }));
        // Update last fetch time
        setLastFetch(prev => ({
          ...prev,
          [userId]: now
        }));
      } else if (response.status === 429) {
        // If rate limited, wait before allowing another fetch
        setLastFetch(prev => ({
          ...prev,
          [userId]: now + 30000 // Wait 30 seconds before trying again
        }));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching user status:', error.message);
      }
    }
  };

  // Subscribe to real-time status updates
  useEffect(() => {
    const handlers = {
      onNewMessage: (data: any) => {
        if (data.type === 'status-update') {
          setStatuses(prev => ({
            ...prev,
            [data.userId]: data.status
          }));
          // Update last fetch time since we just got fresh data
          setLastFetch(prev => ({
            ...prev,
            [data.userId]: Date.now()
          }));
        } else if (data.type === 'status-delete') {
          setStatuses(prev => {
            const newStatuses = { ...prev };
            delete newStatuses[data.userId];
            return newStatuses;
          });
        }
      }
    };

    // Subscribe to the global presence channel for status updates
    subscribeToChannel('presence-user-status', handlers);

    return () => {
      unsubscribeFromChannel('presence-user-status');
    };
  }, [subscribeToChannel, unsubscribeFromChannel]);

  return (
    <UserStatusContext.Provider value={{ 
      statuses, 
      fetchStatus,
    }}>
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