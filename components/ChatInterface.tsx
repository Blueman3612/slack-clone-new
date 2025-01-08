'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { pusherClient } from '@/lib/pusher'
import { Message, User, Reaction } from '@prisma/client'
import MessageBubble from './MessageBubble'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'
import TypingIndicator from './TypingIndicator'
import axios from 'axios'

interface ExtendedMessage extends Message {
  user?: {
    name: string;
    email: string;
  };
  sender?: {
    name: string;
    email: string;
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
}

interface ChatInterfaceProps {
  chatId: string;
  chatType: 'channel' | 'dm';
  currentUserId: string;
}

export default function ChatInterface({ chatId, chatType, currentUserId }: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { onlineUsers } = useOnlineUsers();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentChannelRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Add this function to handle typing events
  const handleTyping = async () => {
    if (!chatId || !session?.user) return;

    const channelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${[currentUserId, chatId].sort().join('-')}`;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Send typing event through API
      await axios.post('/api/pusher/trigger-event', {
        channel: channelName,
        event: 'typing',
        data: {
          userId: currentUserId,
          name: session.user.name || 'Anonymous'
        }
      });

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(async () => {
        await axios.post('/api/pusher/trigger-event', {
          channel: channelName,
          event: 'stop-typing',
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

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const endpoint = chatType === 'channel'
          ? `/api/messages?channelId=${chatId}`
          : `/api/direct-messages?userId=${chatId}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        if (currentChannelRef.current === chatId) {
          setMessages(data);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    const channelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${[currentUserId, chatId].sort().join('-')}`;

    const channel = pusherClient.subscribe(channelName);

    // Handle typing events
    channel.bind('typing', (data: { userId: string; name: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers((users) => {
          if (!users.includes(data.name)) {
            return [...users, data.name];
          }
          return users;
        });
      }
    });

    channel.bind('stop-typing', (data: { userId: string; name: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers((users) => 
          users.filter(name => name !== data.name)
        );
      }
    });

    // Handle new messages
    channel.bind('new-message', (newMessage: ExtendedMessage) => {
      if (currentChannelRef.current === chatId) {
        setMessages((currentMessages) => {
          if (currentMessages.some(m => m.id === newMessage.id)) {
            return currentMessages;
          }
          return [...currentMessages, newMessage];
        });
        scrollToBottom();
      }
    });

    // Handle reactions
    channel.bind('message-reaction', (data: {
      messageId: string;
      reaction: Reaction;
      type: 'add' | 'remove';
    }) => {
      if (currentChannelRef.current === chatId) { // Only update if we're still on the same chat
        setMessages((currentMessages) =>
          currentMessages.map((msg) => {
            if (msg.id === data.messageId) {
              const reactions = msg.reactions || [];
              if (data.type === 'add') {
                return {
                  ...msg,
                  reactions: [...reactions, data.reaction],
                };
              } else {
                return {
                  ...msg,
                  reactions: reactions.filter(r => r.id !== data.reaction.id),
                };
              }
            }
            return msg;
          })
        );
      }
    });

    return () => {
      pusherClient.unsubscribe(channelName);
      channel.unbind_all();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, chatType, currentUserId]);

  // Reset messages when changing chats
  useEffect(() => {
    setMessages([]);
    setTypingUsers([]);
    currentChannelRef.current = chatId;
  }, [chatId, chatType]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    try {
      const endpoint = chatType === 'channel'
        ? '/api/messages'
        : '/api/direct-messages';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          ...(chatType === 'channel' 
            ? { channelId: chatId }
            : { receiverId: chatId }
          ),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="relative flex flex-col h-screen">
      <div 
        ref={chatContainerRef}
        className="absolute inset-0 overflow-y-auto pt-4 pb-20 bg-white dark:bg-gray-900"
      >
        <div className="px-4 space-y-4 mb-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.userId === currentUserId || message.senderId === currentUserId}
              onlineUsers={onlineUsers}
            />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <TypingIndicator typingUsers={typingUsers} />
        <form onSubmit={handleSubmit} className="p-4">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="w-full p-2 rounded-lg border dark:border-gray-600 
                     bg-white dark:bg-gray-900 
                     text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>
    </div>
  )
} 