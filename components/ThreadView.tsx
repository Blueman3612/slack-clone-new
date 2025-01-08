'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { pusherClient } from '@/lib/pusher'
import { Message, User, Reaction } from '@prisma/client'
import MessageBubble from './MessageBubble'
import { X } from 'lucide-react'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'
import TypingIndicator from './TypingIndicator'
import axios from 'axios'

interface ExtendedMessage extends Message {
  user?: {
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
}

interface ThreadViewProps {
  parentMessage: ExtendedMessage;
  onClose: () => void;
  chatType: 'channel' | 'dm';
  chatId: string;
  currentUserId: string;
}

export default function ThreadView({ 
  parentMessage, 
  onClose,
  chatType,
  chatId,
  currentUserId 
}: ThreadViewProps) {
  const { data: session } = useSession()
  const [replies, setReplies] = useState<ExtendedMessage[]>([])
  const [newReply, setNewReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { onlineUsers } = useOnlineUsers()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle typing events
  const handleTyping = async () => {
    if (!session?.user) return;

    const channelName = chatType === 'channel'
      ? `thread-channel-${chatId}-${parentMessage.id}`
      : `thread-dm-${[currentUserId, chatId].sort().join('-')}-${parentMessage.id}`;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Send typing event
      await axios.post('/api/pusher/trigger-event', {
        channel: channelName,
        event: 'thread-typing',
        data: {
          userId: currentUserId,
          name: session.user.name || 'Anonymous'
        }
      });

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(async () => {
        await axios.post('/api/pusher/trigger-event', {
          channel: channelName,
          event: 'thread-stop-typing',
          data: {
            userId: currentUserId,
            name: session.user.name || 'Anonymous'
          }
        });
      }, 2000);
    } catch (error) {
      console.error('Error sending typing event:', error);
    }
  };

  // Subscribe to thread updates and typing events
  useEffect(() => {
    const channelName = chatType === 'channel'
      ? `thread-channel-${chatId}-${parentMessage.id}`
      : `thread-dm-${[currentUserId, chatId].sort().join('-')}-${parentMessage.id}`;

    const channel = pusherClient.subscribe(channelName);

    // Handle typing events
    channel.bind('thread-typing', (data: { userId: string; name: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers((users) => {
          if (!users.includes(data.name)) {
            return [...users, data.name];
          }
          return users;
        });
      }
    });

    channel.bind('thread-stop-typing', (data: { userId: string; name: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers((users) => 
          users.filter(name => name !== data.name)
        );
      }
    });

    channel.bind('new-reply', (reply: ExtendedMessage) => {
      setReplies(current => {
        if (current.some(msg => msg.id === reply.id)) {
          return current;
        }
        return [...current, reply];
      });
      scrollToBottom();
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, chatType, currentUserId, parentMessage.id]);

  // Fetch thread messages
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const response = await fetch(`/api/messages/thread/${parentMessage.id}`)
        if (response.ok) {
          const data = await response.json()
          setReplies(data)
        }
      } catch (error) {
        console.error('Error fetching replies:', error)
      }
    }

    fetchReplies()
  }, [parentMessage.id])

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [replies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReply.trim() || !session?.user) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/messages/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newReply,
          threadId: parentMessage.id,
          chatId,
          chatType
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send reply')
      }

      setNewReply('')
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-[576px] border-l border-gray-200 dark:border-gray-700 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Thread header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Parent message */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <MessageBubble
          message={parentMessage}
          isOwn={parentMessage.userId === currentUserId}
          showThread={false}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {replies.map((reply) => (
          <MessageBubble
            key={reply.id}
            message={reply}
            isOwn={reply.userId === currentUserId}
            showThread={false}
            onlineUsers={onlineUsers}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator and reply input */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <TypingIndicator typingUsers={typingUsers} />
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={newReply}
              onChange={(e) => {
                setNewReply(e.target.value);
                handleTyping();
              }}
              placeholder="Reply in thread..."
              className="w-full p-2 rounded-lg border dark:border-gray-600 
                       bg-white dark:bg-gray-900 
                       text-gray-900 dark:text-white
                       placeholder-gray-500 dark:placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </form>
        </div>
      </div>
    </div>
  )
}