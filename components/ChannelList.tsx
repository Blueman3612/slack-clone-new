'use client';

import { useState, useEffect } from 'react';
import { User } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';

interface Channel {
  id: string;
  name: string;
}

interface ChannelListProps {
  currentUser: User;
}

export default function ChannelList({ currentUser }: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChannelId = searchParams.get('channelId');

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error('Failed to fetch channels');
        }
        const data = await response.json();
        setChannels(data);
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, []);

  const handleChannelClick = (channelId: string) => {
    router.push(`/chat?channelId=${channelId}`);
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">Channels</h2>
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