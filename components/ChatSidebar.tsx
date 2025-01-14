'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Channel, User } from '@prisma/client';
import Image from 'next/image';
import UserList from './UserList';
import UserStatus from './UserStatus';
import { Plus } from 'lucide-react';
import { useOnlineUsers } from '@/contexts/OnlineUsersContext';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';
import PusherClient from 'pusher-js';
import { Session } from 'next-auth';

interface Notification {
  count: number;
  hasUnread: boolean;
  hasMention: boolean;
}

interface NotificationState {
  [key: string]: Notification;
}

interface ExtendedSession extends Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function ChatSidebar() {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null; 
    status: 'loading' | 'authenticated' | 'unauthenticated' 
  };
  const { isAdmin } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const currentChannelId = searchParams.get('channelId');
  const currentUserId = searchParams.get('userId');
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const { onlineUsers } = useOnlineUsers();
  const [notifications, setNotifications] = useState<NotificationState>({});
  const [bluemanUser, setBluemanUser] = useState<User | null>(null);

  console.log('Admin status:', {
    isAdmin,
    userRole: session?.user?.role,
    userId: session?.user?.id
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const blueman = data.find((user: User) => user.email === 'blueman@ai.local');
        if (blueman) {
          setBluemanUser(blueman);
          const filteredUsers = data.filter((user: User) => 
            user.id !== session.user.id && user.email !== 'blueman@ai.local'
          );
          setUsers(filteredUsers);
        } else {
          const filteredUsers = data.filter((user: User) => 
            user.id !== session.user.id
          );
          setUsers(filteredUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChannels(data);
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, [session?.user?.id]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      console.log('Attempting to create channel:', newChannelName);
      
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Channel creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to create channel: ${errorData}`);
      }

      const newChannel = await response.json();
      console.log('Channel created successfully:', newChannel);
      
      setChannels(prev => [...prev, newChannel]);
      setNewChannelName('');
      setIsCreating(false);
      router.push(`/chat?channelId=${newChannel.id}`);
    } catch (error) {
      console.error('Error in handleCreateChannel:', error);
      throw error;
    }
  };

  const handleNewMessage = (message: any) => {
    if (!session?.user?.id) return;
    
    console.log('Received message:', message);
    
    setNotifications(prev => {
      if (message.userId === session.user.id) return prev;

      let key;
      let shouldNotify = true;

      if (message.receiverId) {
        const isDMForCurrentUser = message.receiverId === session.user.id;
        if (!isDMForCurrentUser) return prev;
        
        key = `dm-${message.userId}`;
        shouldNotify = currentUserId !== message.userId;
      } 
      else if (message.channelId) {
        key = message.channelId;
        shouldNotify = currentChannelId !== message.channelId;
      }
      else {
        return prev;
      }

      if (!shouldNotify) return prev;

      console.log('Updating notifications:', {
        key,
        shouldNotify,
        currentUserId,
        messageUserId: message.userId,
        messageReceiverId: message.receiverId
      });

      const currentNotification = prev[key] || { count: 0, hasUnread: false, hasMention: false };
      const hasMention = message.content.includes(`@${session.user.name}`) || 
                        message.content.includes('@everyone');

      return {
        ...prev,
        [key]: {
          count: currentNotification.count + 1,
          hasUnread: true,
          hasMention: hasMention || currentNotification.hasMention
        }
      };
    });
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    channels.forEach(channel => {
      const channelName = `channel-${channel.id}`;
      const subscription = pusher.subscribe(channelName);
      subscription.bind('new-message', handleNewMessage);
    });

    if (session.user.id) {
      const dmChannel = `dm-${session.user.id}`;
      const dmSubscription = pusher.subscribe(dmChannel);
      dmSubscription.bind('new-message', handleNewMessage);
    }

    return () => {
      if (session.user.id) {
        pusher.unsubscribe(`dm-${session.user.id}`);
      }
      channels.forEach(channel => {
        pusher.unsubscribe(`channel-${channel.id}`);
      });
      pusher.disconnect();
    };
  }, [session?.user?.id, channels]);

  useEffect(() => {
    if (currentChannelId) {
      setNotifications(prev => ({
        ...prev,
        [currentChannelId]: { count: 0, hasUnread: false, hasMention: false }
      }));
    } else if (currentUserId) {
      setNotifications(prev => ({
        ...prev,
        [`dm-${currentUserId}`]: { count: 0, hasUnread: false, hasMention: false }
      }));
    }
  }, [currentChannelId, currentUserId]);

  if (status === 'loading') {
    return <div className="w-64 bg-gray-900 text-white p-4">Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative w-16 h-16">
            <Image
              src="/Acksle Logo.png"
              alt="Acksle Logo"
              fill
              className="object-contain [image-rendering:pixelated]"
              priority
            />
          </div>
          <h1 className="text-4xl font-light tracking-wider leading-none" style={{ transform: 'scaleY(2)' }}>
            ACKSLE
          </h1>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Channels</h2>
            {/* Debug: isAdmin={isAdmin?.toString()} */}
            {isAdmin && (
              <button
                onClick={() => setIsCreating(true)}
                className="text-gray-400 hover:text-white"
                title="Create Channel"
              >
                <Plus size={20} />
              </button>
            )}
          </div>

          {isCreating && isAdmin && (
            <form onSubmit={handleCreateChannel} className="mb-4">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="New channel name"
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </form>
          )}

          <ul className="space-y-1">
            {channels.map(channel => {
              const notification = notifications[channel.id];
              return (
                <li 
                  key={channel.id}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200",
                    currentChannelId === channel.id
                      ? "bg-blue-600/30 border-l-4 border-blue-500"
                      : "hover:bg-gray-700 border-l-4 border-transparent"
                  )}
                  onClick={() => router.push(`/chat?channelId=${channel.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm transition-colors duration-200",
                      currentChannelId === channel.id ? "text-blue-400" : "text-gray-300"
                    )}>#</span>
                    <span className={cn(
                      "text-sm transition-colors duration-200",
                      notification?.hasUnread ? "font-bold" : "font-normal",
                      currentChannelId === channel.id ? "text-blue-400" : "text-white"
                    )}>
                      {channel.name}
                    </span>
                  </div>
                  {notification?.count > 0 && (
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded-full",
                      notification.hasMention ? "bg-red-500" : "bg-gray-600"
                    )}>
                      {notification.count}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <UserList
          initialUsers={bluemanUser ? [bluemanUser, ...users] : users}
          currentUserId={session?.user?.id || ''}
          onUserClick={(userId) => router.push(`/chat?userId=${userId}`)}
          selectedUserId={currentUserId}
          onlineUsers={onlineUsers}
          notifications={notifications}
        />
      </div>

      <UserStatus />
    </div>
  );
} 