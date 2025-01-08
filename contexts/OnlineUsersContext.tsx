'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';

type OnlineUsersContextType = {
  onlineUsers: Set<string>;
};

const OnlineUsersContext = createContext<OnlineUsersContextType>({ onlineUsers: new Set() });

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to global presence channel
    const channel = pusherClient.subscribe('presence-global');

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const onlineUserIds = new Set<string>();
      members.each((member: any) => {
        onlineUserIds.add(member.id);
      });
      setOnlineUsers(onlineUserIds);
    });

    channel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers((prev) => new Set([...prev, member.id]));
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(member.id);
        return newSet;
      });
    });

    return () => {
      pusherClient.unsubscribe('presence-global');
    };
  }, []);

  return (
    <OnlineUsersContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

export const useOnlineUsers = () => useContext(OnlineUsersContext); 