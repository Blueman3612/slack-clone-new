'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { Message, Reaction } from '@/types'
import { useSession } from 'next-auth/react'
import EmojiPicker from './EmojiPicker'
import { MessageSquare, Shield } from 'lucide-react'
import Image from 'next/image'
import { pusherClient } from '@/lib/pusher'
import { highlightText } from '@/utils/highlightText'
import StatusTooltip from './StatusTooltip'
import { useUserStatus } from '@/contexts/UserStatusContext'

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onlineUsers?: Set<string>;
  onThreadClick?: () => void;
  showThread?: boolean;
  chatType: 'channel' | 'dm';
  chatId: string;
  searchQuery?: string;
}

const debug = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[MessageBubble] ${message}`);
  }
};

export default function MessageBubble({ 
  message: initialMessage,
  isOwn, 
  onlineUsers,
  onThreadClick,
  showThread = true,
  chatType,
  chatId,
  searchQuery = ''
}: MessageBubbleProps) {
  const { data: session } = useSession()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [message, setMessage] = useState<Message>(initialMessage)
  const [replyCount, setReplyCount] = useState(initialMessage.replyCount || 0)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const [showUserStatus, setShowUserStatus] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { statuses, fetchStatus } = useUserStatus()

  const effectiveChatId = chatType === 'channel' 
    ? message.channelId 
    : message.receiverId 
      ? [message.userId, message.receiverId].sort().join('-')
      : chatId;

  useEffect(() => {
    setMessage(initialMessage)
    setReplyCount(initialMessage.replyCount || 0)
  }, [initialMessage])

  useEffect(() => {
    if (!effectiveChatId) return;

    const channelName = `presence-${chatType}-${effectiveChatId}`;
    debug(`Subscribing to channel: ${channelName}`);

    const channel = pusherClient.subscribe(channelName);

    const handleThreadUpdate = (data: { 
      messageId?: string;
      threadId?: string;
      replyCount: number;
    }) => {
      const targetId = data.messageId || data.threadId;
      if (targetId === message.id) {
        setReplyCount(data.replyCount);
      }
    };

    channel.bind('update-thread', handleThreadUpdate);
    channel.bind('thread-updated', handleThreadUpdate);
    channel.bind('thread-count-update', handleThreadUpdate);

    return () => {
      channel.unbind('update-thread', handleThreadUpdate);
      channel.unbind('thread-updated', handleThreadUpdate);
      channel.unbind('thread-count-update', handleThreadUpdate);
      pusherClient.unsubscribe(channelName);
    };
  }, [effectiveChatId, chatType, message.id, message.userId, message.receiverId]);

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

  const userName = message.user?.name || 'Unknown User'
  const userImage = message.user?.image || '/default-avatar.png'
  const isOnline = onlineUsers?.has(message.userId)

  const handleReaction = async (emoji: string) => {
    if (!session?.user?.id || !effectiveChatId) return;
    
    try {
      debug('Sending reaction:', { 
        emoji, 
        messageId: message.id, 
        chatType, 
        chatId: effectiveChatId 
      });

      const response = await fetch('/api/messages/reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          emoji,
          chatType,
          chatId: effectiveChatId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }

      const data = await response.json();
      debug('Reaction added successfully:', data);
      setShowEmojiPicker(false);
    } catch (error) {
      debug('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (reactionId: string) => {
    try {
      const response = await fetch(`/api/messages/reaction?reactionId=${reactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatType,
          chatId: effectiveChatId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }
    } catch (error) {
      debug('Error removing reaction:', error);
    }
  };

  useEffect(() => {
    if (!effectiveChatId) return;

    const channelName = `presence-${chatType}-${effectiveChatId}`;
    debug(`Subscribing to channel: ${channelName}`);

    const channel = pusherClient.subscribe(channelName);

    const handleReactionAdded = (data: { messageId: string, reaction: Reaction }) => {
      debug('Reaction added event received:', data);
      if (data.messageId === message.id) {
        debug('Updating message with new reaction');
        setMessage(prev => ({
          ...prev,
          reactions: [...(prev.reactions || []), data.reaction]
        }));
      }
    };

    const handleReactionRemoved = (data: { messageId: string, reactionId: string }) => {
      debug('Reaction removed event received:', data);
      if (data.messageId === message.id) {
        debug('Removing reaction from message');
        setMessage(prev => ({
          ...prev,
          reactions: (prev.reactions || []).filter(r => r.id !== data.reactionId)
        }));
      }
    };

    channel.bind('reaction-added', handleReactionAdded);
    channel.bind('reaction-removed', handleReactionRemoved);

    return () => {
      debug(`Cleaning up Pusher subscription for: ${channelName}`);
      channel.unbind('reaction-added', handleReactionAdded);
      channel.unbind('reaction-removed', handleReactionRemoved);
      pusherClient.unsubscribe(channelName);
    };
  }, [effectiveChatId, chatType, message.id]);

  const handleReactionClick = async (reaction: Reaction) => {
    if (!session?.user?.id) return;

    // If the user has already reacted with this emoji, remove their reaction
    const userHasReacted = message.reactions?.some(
      r => r.emoji === reaction.emoji && r.userId === session.user.id
    );

    if (userHasReacted) {
      // Find the user's reaction to remove
      const userReaction = message.reactions?.find(
        r => r.emoji === reaction.emoji && r.userId === session.user.id
      );
      if (userReaction) {
        await handleRemoveReaction(userReaction.id);
      }
    } else {
      // Add the same reaction
      await handleReaction(reaction.emoji);
    }
  };

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        users: [],
        count: 0,
        hasReacted: false
      };
    }
    acc[reaction.emoji].users.push(reaction.user.name);
    acc[reaction.emoji].count++;
    if (reaction.userId === session?.user?.id) {
      acc[reaction.emoji].hasReacted = true;
    }
    return acc;
  }, {} as { [key: string]: { users: string[], count: number, hasReacted: boolean } });

  const renderContent = () => {
    if (message.fileUrl) {
      return (
        <div className="mt-1">
          {message.fileType?.startsWith('image/') ? (
            <Image
              src={message.fileUrl}
              alt={message.fileName || 'Uploaded image'}
              width={200}
              height={200}
              className="rounded-md"
            />
          ) : (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {message.fileName || 'Download file'}
            </a>
          )}
        </div>
      );
    }

    return (
      <div className="mt-1">
        {message.content && searchQuery ? (
          <div className="whitespace-pre-wrap break-words">
            {highlightText(message.content, searchQuery)}
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}
      </div>
    );
  };

  // Subscribe to thread count updates
  useEffect(() => {
    const channelName = `thread-${message.id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind('thread-count-update', (data: { replyCount: number }) => {
      console.log('Received thread count update:', data);
      setReplyCount(data.replyCount);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [message.id]);

  // Add status fetching effect
  useEffect(() => {
    if (showUserStatus && message.user?.id && !statuses[message.user.id]) {
      fetchStatus(message.user.id);
    }
  }, [showUserStatus, message.user?.id, fetchStatus, statuses]);

  return (
    <div className="flex items-start space-x-3 group px-4 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-100">
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
        {showUserStatus && message.user?.id && statuses[message.user.id] && avatarRef.current && (
          <StatusTooltip 
            emoji={statuses[message.user.id]?.emoji} 
            text={statuses[message.user.id]?.text}
            targetRef={avatarRef.current}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">{userName}</span>
          {message.user?.role === 'ADMIN' && (
            <Shield className="w-4 h-4 text-blue-400" title="Admin" />
          )}
          <span className="text-xs text-gray-500">
            {isToday(new Date(message.createdAt))
              ? format(new Date(message.createdAt), 'h:mm a')
              : format(new Date(message.createdAt), 'MMMM d, h:mm a')}
          </span>
        </div>

        {renderContent()}

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions || {}).map(([emoji, { users, count, hasReacted }]) => {
              const userReaction = message.reactions?.find(
                r => r.emoji === emoji && r.userId === session?.user?.id
              );
              
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(
                    userReaction || message.reactions?.find(r => r.emoji === emoji)!
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