'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Message, Reaction } from '@prisma/client'
import { useSession } from 'next-auth/react'
import EmojiPicker from './EmojiPicker'
import { MessageSquare } from 'lucide-react'
import Image from 'next/image'
import { pusherClient } from '@/lib/pusher'

interface ExtendedMessage extends Message {
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
  sender?: {
    name: string;
    email: string;
    image?: string | null;
  };
  receiver?: {
    name: string;
    email: string;
  };
  reactions?: (Reaction & {
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  })[];
  replyCount?: number;
  isThreadStarter?: boolean;
}

interface MessageBubbleProps {
  message: ExtendedMessage;
  isOwn: boolean;
  onlineUsers?: Set<string>;
  onThreadClick?: () => void;
  showThread?: boolean;
  channelId?: string;
}

export default function MessageBubble({ 
  message, 
  isOwn, 
  onlineUsers,
  onThreadClick,
  showThread = true,
  channelId
}: MessageBubbleProps) {
  const { data: session } = useSession()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyCount, setReplyCount] = useState(message.replyCount || 0)

  useEffect(() => {
    if (!channelId) return;

    const channel = pusherClient.subscribe(`channel-${channelId}`);

    channel.bind('update-thread', (data: { 
      messageId: string; 
      replyCount: number; 
      isThreadStarter: boolean;
    }) => {
      if (data.messageId === message.id) {
        console.log(`Updating reply count for message ${message.id} to ${data.replyCount}`);
        setReplyCount(data.replyCount);
      }
    });

    return () => {
      channel.unbind('update-thread');
      pusherClient.unsubscribe(`channel-${channelId}`);
    };
  }, [channelId, message.id]);

  const userName = message.user?.name || message.sender?.name || 'Unknown User'
  const userImage = message.user?.image || message.sender?.image || '/default-avatar.png'
  const isOnline = onlineUsers?.has(message.userId || message.senderId || '')

  console.log("Message data:", {
    id: message.id,
    replyCount: message.replyCount,
    showThread,
    hasReplies: message.replyCount > 0
  });

  const handleReaction = async (emoji: string) => {
    try {
      const response = await fetch('/api/messages/reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          emoji,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add reaction')
      }

      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleRemoveReaction = async (reactionId: string) => {
    try {
      const response = await fetch(`/api/messages/reaction/${reactionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove reaction')
      }
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  return (
    <div className="flex items-start space-x-3 group px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="relative flex-shrink-0">
        <Image
          src={userImage}
          alt={userName}
          width={36}
          height={36}
          className="rounded-md"
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">{userName}</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => handleRemoveReaction(reaction.id)}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs
                  bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {reaction.emoji} <span className="ml-1">{reaction.user.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {showThread && replyCount > 0 && (
          <div className="mt-1">
            <button 
              onClick={onThreadClick}
              className="text-xs inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 
                       dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          😀
        </button>
        
        {showThread && (
          <button
            onClick={onThreadClick}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="Reply in thread"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      {showEmojiPicker && (
        <div className="absolute z-50 mt-10">
          <EmojiPicker onEmojiSelect={handleReaction} />
        </div>
      )}
    </div>
  )
} 