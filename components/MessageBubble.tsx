import { memo, useState } from 'react';
import { Smile } from 'lucide-react';
import axios from 'axios';
import type { Reaction } from '@/types';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    reactions?: Reaction[];
    user?: {
      id: string;
      name?: string;
      email?: string;
    };
  };
  isOwn: boolean;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀'];

const MessageBubble = memo(function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const displayName = message.user?.name || message.user?.email?.split('@')[0] || 'Anonymous';

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

  // Group reactions by emoji
  const reactionCounts = message.reactions?.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="flex items-start space-x-2 mb-4 group">
      {/* Reaction button */}
      <div className={`flex items-center ${isOwn ? 'order-last' : 'order-first'}`}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 
                     invisible group-hover:visible"
        >
          <Smile className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Message content */}
      <div className={`relative max-w-[70%] ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          {/* Username */}
          <div className={`text-sm font-medium ${isOwn ? 'text-white/90' : 'text-gray-600'} mb-1`}>
            {displayName}
          </div>

          {/* Message text */}
          <div>{message.content}</div>

          {/* Reactions display */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`text-xs px-2 py-1 rounded-full 
                    ${isOwn 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div 
            className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-2 
                       bg-white shadow-lg rounded-lg p-2 z-10 border border-gray-200`}
          >
            <div className="grid grid-cols-3 gap-2">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className="hover:bg-gray-100 p-2 rounded text-xl transition-colors duration-200"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageBubble; 