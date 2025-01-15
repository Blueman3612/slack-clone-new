'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePusher } from '@/contexts/PusherContext';

interface ThreadProps {
  parentMessage: any;
  onClose: () => void;
}

export default function Thread({ parentMessage, onClose }: ThreadProps) {
  const { data: session } = useSession();
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState('');
  const { subscribeToChannel, unsubscribeFromChannel } = usePusher();

  useEffect(() => {
    // Fetch initial replies
    fetchReplies();

    // Subscribe to new replies using PusherContext
    const channelName = `thread-${parentMessage.id}`;
    subscribeToChannel(channelName, {
      onNewMessage: (reply: any) => {
        setReplies((current) => [...current, reply]);
      }
    });

    return () => {
      unsubscribeFromChannel(channelName);
    };
  }, [parentMessage.id, subscribeToChannel, unsubscribeFromChannel]);

  const fetchReplies = async () => {
    const response = await fetch(`/api/messages/${parentMessage.id}/replies`);
    const data = await response.json();
    setReplies(data);
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newReply,
          channelId: parentMessage.channelId,
          parentId: parentMessage.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send reply');
      setNewReply('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-gray-800 p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Thread</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-700 rounded">
        <div className="text-sm text-gray-300">{parentMessage.user?.name}</div>
        <div className="text-white">{parentMessage.content}</div>
      </div>

      <div className="h-[calc(100vh-250px)] overflow-y-auto mb-4">
        {replies.map((reply) => (
          <div
            key={reply.id}
            className={`flex mb-4 ${
              reply.userId === session?.user?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                reply.userId === session?.user?.id ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <div className="text-sm text-gray-300">{reply.user?.name}</div>
              <div className="text-white">{reply.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendReply} className="mt-auto">
        <input
          type="text"
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          placeholder="Reply in thread..."
          className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
    </div>
  );
} 