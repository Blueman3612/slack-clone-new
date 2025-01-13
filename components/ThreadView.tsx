'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { pusherClient } from '@/lib/pusher'
import { Message } from '@/types'
import MessageBubble from './MessageBubble'
import { X } from 'lucide-react'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'
import TypingIndicator from './TypingIndicator'
import axios from 'axios'

interface ThreadViewProps {
  parentMessage: Message;
  onClose: () => void;
  chatType: 'channel' | 'dm';
  chatId: string;
  currentUserId: string;
}

export default function ThreadView({ 
  parentMessage: initialParentMessage,
  onClose,
  chatType,
  chatId,
  currentUserId
}: ThreadViewProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [parentMessage, setParentMessage] = useState(initialParentMessage)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { onlineUsers } = useOnlineUsers()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle typing events
  const handleTyping = async () => {
    if (!session?.user) return;

    const channelName = `thread-${parentMessage.id}`;

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
    const channelName = `thread-${parentMessage.id}`;
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

    channel.bind('new-reply', (reply: Message) => {
      setMessages(current => {
        if (current.some(msg => msg.id === reply.id)) {
          return current;
        }
        return [...current, reply];
      });
      scrollToBottom();
    });

    channel.bind('thread-count-update', (data: { replyCount: number }) => {
      setParentMessage(prev => ({
        ...prev,
        replyCount: data.replyCount
      }));
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, parentMessage.id]);

  // Fetch thread messages
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const response = await fetch(`/api/messages/thread/${parentMessage.id}`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data)
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
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage;
    setNewMessage('');

    try {
      const response = await fetch('/api/messages/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          threadId: parentMessage.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      // The reply count will be updated through Pusher
      scrollToBottom();
    } catch (error) {
      console.error('Error sending reply:', error);
      setNewMessage(messageContent);
    }
  };

  // Add Pusher subscription for real-time updates
  useEffect(() => {
    const channel = pusherClient.subscribe(`thread-${parentMessage.id}`);

    channel.bind('new-reply', (message: Message) => {
      setMessages(prev => {
        // Avoid duplicate messages
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`thread-${parentMessage.id}`);
    };
  }, [parentMessage.id]);

  useEffect(() => {
    const channelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${[currentUserId, chatId].sort().join('-')}`;

    const channel = pusherClient.subscribe(channelName);

    // Handle new thread replies
    channel.bind('new-message', (message: Message) => {
      if (message.threadId === parentMessage.id) {
        setMessages(current => {
          if (current.some(m => m.id === message.id)) {
            return current;
          }
          return [...current, message];
        });
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Handle message deletions in thread
    channel.bind('message-deleted', ({ messageId }: { messageId: string }) => {
      setMessages(current => current.filter(reply => reply.id !== messageId));
    });

    return () => {
      pusherClient.unsubscribe(channelName);
      channel.unbind_all();
    };
  }, [chatId, chatType, currentUserId, parentMessage.id]);

  // Add instant scroll to bottom when thread loads
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [isLoading, messages.length]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
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
          chatType={chatType}
          chatId={chatId}
        />
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.userId === currentUserId}
            showThread={false}
            onlineUsers={onlineUsers}
            chatType={chatType}
            chatId={chatId}
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
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
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