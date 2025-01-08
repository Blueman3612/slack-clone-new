import { memo, useState } from 'react';
import { Smile } from 'lucide-react';
import axios from 'axios';
import type { Reaction } from '@/types';
import UserAvatar from './UserAvatar';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    reactions?: Reaction[];
    user?: {
      id: string;
      name?: string;
      email?: string;
      image?: string | null;
    };
  };
  isOwn: boolean;
  onlineUsers?: Set<string>;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀'];

const MessageBubble = memo(function MessageBubble({ message, isOwn, onlineUsers = new Set() }: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const displayName = message.user?.name || message.user?.email?.split('@')[0] || 'Anonymous';
  const isOnline = message.user?.id ? onlineUsers.has(message.user.id) : false;

  const handleReactionClick = async (emoji: string) => {
    try {
      const isDirectMessage = 'senderId' in message;
      const endpoint = isDirectMessage 
        ? `/api/direct-messages/${message.id}/reactions`
        : `/api/messages/${message.id}/reactions`;
        
      await axios.post(endpoint, { emoji });
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const reactionCounts = message.reactions?.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="flex items-start space-x-3 group px-4 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <UserAvatar
        image={message.user?.image}
        name={displayName}
        isOnline={isOnline}
      />

      {/* Message content */}
      <div className="flex-grow min-w-0">
        {/* Header */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {displayName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>

        {/* Message text */}
        <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">
          {message.content}
        </div>

        {/* Reactions */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="inline-flex items-center px-2 py-0.5 rounded-full 
                         text-xs border border-gray-200 dark:border-gray-700 
                         bg-white dark:bg-gray-800
                         text-gray-700 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-700 
                         transition-colors duration-200"
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reaction button */}
      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="opacity-0 group-hover:opacity-100 transition-opacity 
                   p-1.5 rounded-full 
                   text-gray-500 dark:text-gray-400
                   hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Smile className="w-4 h-4" />
      </button>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute ml-12 mt-8 
                      bg-white dark:bg-gray-800 
                      shadow-lg rounded-lg p-2 z-10 
                      border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-2">
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 
                         p-2 rounded text-xl transition-colors duration-200"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default MessageBubble; 