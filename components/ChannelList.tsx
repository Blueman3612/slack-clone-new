'use client';

import { useState, useEffect } from 'react';
import { User } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { pusherClient } from '@/lib/pusher';

interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface ChannelListProps {
  currentUser: User;
}

export default function ChannelList({ currentUser }: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChannelId = searchParams.get('channelId');

  useEffect(() => {
    fetchChannels();

    // Subscribe to channel updates
    const channel = pusherClient.subscribe('channel-updates');

    channel.bind('channel-created', (newChannel: Channel) => {
      setChannels(prev => {
        if (prev.some(ch => ch.id === newChannel.id)) return prev;
        return [...prev, newChannel];
      });
    });

    channel.bind('channel-updated', (updatedChannel: Channel) => {
      setChannels(prev => 
        prev.map(ch => ch.id === updatedChannel.id ? updatedChannel : ch)
      );
    });

    channel.bind('channel-deleted', (channelId: string) => {
      setChannels(prev => prev.filter(ch => ch.id !== channelId));
      if (currentChannelId === channelId) {
        router.push('/chat');
      }
    });

    return () => {
      pusherClient.unsubscribe('channel-updates');
    };
  }, [currentChannelId, router]);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await response.json();
      setChannels(data);

      // Only redirect to general if no channel OR user is selected
      if (!currentChannelId && !searchParams.get('userId') && data.length > 0) {
        const generalChannel = data.find((channel: Channel) => channel.name === 'general');
        if (generalChannel) {
          router.push(`/chat?channelId=${generalChannel.id}`);
        }
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleChannelClick = (channelId: string) => {
    router.push(`/chat?channelId=${channelId}`);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
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
        throw new Error('Failed to create channel');
      }

      const newChannel = await response.json();
      setNewChannelName('');
      setIsCreating(false);
      router.push(`/chat?channelId=${newChannel.id}`);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Channels</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="text-gray-400 hover:text-white"
        >
          <Plus size={20} />
        </button>
      </div>

      {isCreating && (
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

      <ul>
        {channels.map((channel) => (
          <li
            key={channel.id}
            onClick={() => handleChannelClick(channel.id)}
            className={`
              flex items-center gap-2 p-2 rounded cursor-pointer
              ${currentChannelId === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'}
            `}
          >
            <span className="text-gray-300">#</span>
            <span className="text-white">{channel.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 