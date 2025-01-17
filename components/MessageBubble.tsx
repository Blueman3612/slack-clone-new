'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { Message, Reaction } from '@/types'
import { useSession } from 'next-auth/react'
import EmojiPicker from './EmojiPicker'
import { MessageSquare, Shield, Trash2, Bot } from 'lucide-react'
import Image from 'next/image'
import { usePusher } from '@/contexts/PusherContext'
import { highlightText } from '@/utils/highlightText'
import StatusTooltip from './StatusTooltip'
import { useUserStatus } from '@/contexts/UserStatusContext'
import { useRole } from '@/hooks/useRole'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onThreadClick?: () => void;
  showThread?: boolean;
  chatType: 'channel' | 'dm';
  chatId: string;
  searchQuery?: string;
  onMessageClick?: () => void;
  isSearchResult?: boolean;
  isHighlighted?: boolean;
  onReactionAdd?: (messageId: string, emoji: string) => void;
  onReactionRemove?: (messageId: string, reactionId: string) => void;
}

const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    const message = args[0];
    const isCritical = 
      message.includes('Error:') || 
      message.includes('failed');
      
    if (isCritical) {
      console.debug('[MessageBubble]', ...args);
    }
  }
};

export default function MessageBubble({ 
  message: initialMessage,
  isOwn, 
  onThreadClick,
  showThread = true,
  chatType,
  chatId,
  searchQuery = '',
  onMessageClick,
  isSearchResult = false,
  isHighlighted = false,
  onReactionAdd,
  onReactionRemove
}: MessageBubbleProps) {
  const { data: session } = useSession()
  const { isAdmin } = useRole()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const [showUserStatus, setShowUserStatus] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { statuses, fetchStatus } = useUserStatus()
  const { onlineUsers } = useOnlineUsers()

  const effectiveChatId = chatType === 'channel' 
    ? initialMessage.channelId 
    : initialMessage.receiverId 
      ? [initialMessage.userId, initialMessage.receiverId].sort().join('-')
      : chatId;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        const picker = document.querySelector('[data-emoji-picker]');
        if (!picker?.contains(event.target as Node)) {
          setShowEmojiPicker(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const userName = initialMessage.user?.name || 'Unknown User'
  const userImage = initialMessage.user?.image || '/default-avatar.png'
  const isOnline = onlineUsers?.has(initialMessage.userId)

  // Group reactions by emoji
  const groupedReactions = initialMessage.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        users: [],
        count: 0,
        hasReacted: false
      };
    }
    if (reaction.user?.name) {
      acc[reaction.emoji].users.push(reaction.user.name);
    }
    acc[reaction.emoji].count++;
    if (reaction.userId === session?.user?.id) {
      acc[reaction.emoji].hasReacted = true;
    }
    return acc;
  }, {} as { [key: string]: { users: string[], count: number, hasReacted: boolean } }) || {};

  const handleReaction = (emoji: string) => {
    if (!session?.user?.id) return;
    onReactionAdd?.(initialMessage.id, emoji);
    setShowEmojiPicker(false);
  };

  const handleReactionClick = (reaction: Reaction) => {
    if (!session?.user?.id) return;

    // If the user has already reacted with this emoji, remove their reaction
    const userHasReacted = initialMessage.reactions?.some(
      r => r.emoji === reaction.emoji && r.userId === session.user.id
    );

    if (userHasReacted) {
      // Find the user's reaction to remove
      const userReaction = initialMessage.reactions?.find(
        r => r.emoji === reaction.emoji && r.userId === session.user.id
      );
      if (userReaction) {
        onReactionRemove?.(initialMessage.id, userReaction.id);
      }
    } else {
      // Add the same reaction
      handleReaction(reaction.emoji);
    }
  };

  const renderContent = () => {
    if (initialMessage.fileUrl) {
      return (
        <div className="mt-1">
          {initialMessage.fileType?.startsWith('image/') ? (
            <Image
              src={initialMessage.fileUrl}
              alt={initialMessage.fileName || 'Uploaded image'}
              width={200}
              height={200}
              className="rounded-md"
            />
          ) : (
            <a
              href={initialMessage.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {initialMessage.fileName || 'Download file'}
            </a>
          )}
        </div>
      );
    }

    if (searchQuery) {
      return highlightText(initialMessage.content, searchQuery);
    }

    // Handle user mentions
    const mentionRegex = /@(\w+)/g;
    const parts = initialMessage.content.split(mentionRegex);
    
    if (parts.length === 1) {
      return <div className="whitespace-pre-wrap break-words">{initialMessage.content}</div>;
    }

    return (
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (index % 2 === 1) { // This is a mention
            return (
              <span 
                key={index} 
                className="text-blue-500 hover:underline cursor-pointer font-medium"
              >
                @{part}
              </span>
            );
          }
          return part;
        })}
      </div>
    );
  };

  // Add status fetching effect
  useEffect(() => {
    if (showUserStatus && initialMessage.user?.id && !statuses[initialMessage.user.id]) {
      fetchStatus(initialMessage.user.id);
    }
  }, [showUserStatus, initialMessage.user?.id, fetchStatus, statuses]);

  const handleDelete = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/messages/${initialMessage.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      debug('Message deleted successfully');
    } catch (error) {
      debug('Error deleting message:', error);
    }
  };

  // Determine if delete button should be shown
  const showDeleteButton = isOwn || (isAdmin && chatType === 'channel');

  return (
    <div 
      className={`flex items-start space-x-3 group px-4 py-2 
        ${isSearchResult ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.02]'} 
        transition-colors duration-100 ${
          isHighlighted ? 'animate-highlight bg-yellow-100 dark:bg-yellow-900' : ''
        }`}
      onClick={isSearchResult ? onMessageClick : undefined}
      id={`message-${initialMessage.id}`}
    >
      <div 
        ref={avatarRef}
        className="relative flex-shrink-0"
        onMouseEnter={() => setShowUserStatus(true)}
        onMouseLeave={() => setShowUserStatus(false)}
      >
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
        {showUserStatus && initialMessage.user?.id && statuses[initialMessage.user.id] && avatarRef.current && (
          <StatusTooltip 
            emoji={statuses[initialMessage.user.id]?.emoji} 
            text={statuses[initialMessage.user.id]?.text}
            targetRef={avatarRef.current}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">{userName}</span>
          {initialMessage.user?.role === 'ADMIN' && (
            <Shield 
              className="w-4 h-4 text-blue-400" 
              aria-label="Admin"
            />
          )}
          {initialMessage.user?.role === 'AI' && (
            <Bot 
              className="w-4 h-4 text-purple-400" 
              aria-label="AI Bot"
            />
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(() => {
              try {
                const date = new Date(initialMessage.createdAt);
                if (isNaN(date.getTime())) {
                  return 'Invalid date';
                }
                return isToday(date)
                  ? format(date, 'h:mm a')
                  : format(date, 'MMMM d, h:mm a');
              } catch (error) {
                return 'Invalid date';
              }
            })()}
          </span>
        </div>

        {renderContent()}

        {initialMessage.reactions && initialMessage.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions || {}).map(([emoji, { users, count, hasReacted }]) => {
              const userReaction = initialMessage.reactions?.find(
                r => r.emoji === emoji && r.userId === session?.user?.id
              );
              
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(
                    userReaction || initialMessage.reactions?.find(r => r.emoji === emoji)!
                  )}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                    bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                    ${hasReacted ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                  title={users.join(', ')}
                >
                  <span>{emoji}</span>
                  {count > 1 && (
                    <span className="ml-1 text-gray-600 dark:text-gray-300">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {showThread && (initialMessage.replyCount ?? 0) > 0 && (
          <div className="mt-1">
            <button 
              onClick={onThreadClick}
              className="text-xs inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 
                       dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{initialMessage.replyCount} {initialMessage.replyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
        <button
          ref={emojiButtonRef}
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

        {showDeleteButton && (
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-red-600 dark:hover:text-red-400"
            title={isAdmin && !isOwn ? "Delete message (Admin)" : "Delete message"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {showEmojiPicker && (
        <div className="fixed z-50">
          <EmojiPicker 
            onEmojiSelect={handleReaction}
            position="top"
            targetRef={emojiButtonRef}
          />
        </div>
      )}
    </div>
  )
} 