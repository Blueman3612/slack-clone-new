'use client'

import { Message } from '@/types'
import MessageBubble from './MessageBubble'
import { useSession } from 'next-auth/react'

interface SearchResultsProps {
  results: Message[];
  searchQuery: string;
  onThreadClick?: (message: Message) => void;
}

export default function SearchResults({ 
  results, 
  searchQuery,
  onThreadClick 
}: SearchResultsProps) {
  const { data: session } = useSession()

  // Group messages by channel/DM
  const groupedResults = results.reduce((acc, message) => {
    const key = message.channelId 
      ? `channel:${message.channelId}` 
      : `dm:${message.receiverId || message.userId}`;
    
    if (!acc[key]) {
      acc[key] = {
        type: message.channelId ? 'channel' : 'dm',
        name: message.channelId 
          ? message.channel?.name 
          : message.receiverId === session?.user?.id
            ? message.user.name
            : message.receiver?.name,
        messages: []
      };
    }
    
    acc[key].messages.push(message);
    return acc;
  }, {} as Record<string, { type: 'channel' | 'dm', name: string, messages: Message[] }>);

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(groupedResults).map(([key, group]) => (
        <div key={key} className="mb-6">
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 sticky top-0">
            <h3 className="text-sm font-semibold">
              {group.type === 'channel' ? '#' : '@'} {group.name}
            </h3>
          </div>
          <div>
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.userId === session?.user?.id}
                chatType={group.type === 'channel' ? 'channel' : 'dm'}
                chatId={group.type === 'channel' ? message.channelId! : message.receiverId!}
                searchQuery={searchQuery}
                onThreadClick={() => onThreadClick?.(message)}
              />
            ))}
          </div>
        </div>
      ))}
      {results.length === 0 && searchQuery && (
        <div className="flex items-center justify-center h-full text-gray-500">
          No messages found
        </div>
      )}
    </div>
  );
} 