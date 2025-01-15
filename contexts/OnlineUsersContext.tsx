'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePusher } from './PusherContext';

type OnlineUsersContextType = {
  onlineUsers: Set<string>;
};

const OnlineUsersContext = createContext<OnlineUsersContextType>({ onlineUsers: new Set() });

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { subscribeToPresenceChannel, unsubscribeFromChannel } = usePusher();

  useEffect(() => {
    // Subscribe to global presence channel
    subscribeToPresenceChannel('presence-global', {
      onSubscriptionSucceeded: (members: any) => {
        const onlineUserIds = new Set<string>();
        members.each((member: any) => {
          onlineUserIds.add(member.id);
        });
        setOnlineUsers(onlineUserIds);
      },
      onMemberAdded: (member: any) => {
        setOnlineUsers((prev) => new Set(Array.from(prev).concat(member.id)));
      },
      onMemberRemoved: (member: any) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(member.id);
          return newSet;
        });
      }
    });

    return () => {
      unsubscribeFromChannel('presence-global');
    };
  }, [subscribeToPresenceChannel, unsubscribeFromChannel]);

  return (
    <OnlineUsersContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

export const useOnlineUsers = () => useContext(OnlineUsersContext); 