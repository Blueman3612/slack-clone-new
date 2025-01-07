'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { pusherClient } from '@/lib/pusher'
import type { Message, Channel, User, DirectMessage } from '@prisma/client'
import { PresenceChannel } from 'pusher-js'
import { ChannelList } from './ChannelList'
import { DirectMessagesList } from './DirectMessagesList'
import TypingIndicator from './TypingIndicator'
import MessageBubble from './MessageBubble'
import { useSearchParams } from 'next/navigation'

type ChatType = 'channel' | 'direct'

interface ChatState {
  type: ChatType
  target: Channel | User | null
}

interface ChatInterfaceProps {
  initialChannelId?: string | null;
  initialUserId?: string | null;
  currentUser: any;
}

export default function ChatInterface({ 
  initialChannelId, 
  initialUserId, 
  currentUser 
}: ChatInterfaceProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const channelId = initialChannelId || searchParams.get('channelId')
  const userId = initialUserId || searchParams.get('userId')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [typingUsers, setTypingUsers] = useState<{
    [key: string]: { userId: string; name: string; timestamp: number }
  }>({})
  const [chatState, setChatState] = useState<ChatState>({ type: 'channel', target: null })

  // Add ref for messages container
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Debounced typing notification
  const debouncedTyping = useCallback(
    debounce(() => {
      if (!session?.user) return;
      
      const channelName = userId 
        ? `private-dm-${[session.user.id, userId].sort().join('-')}`
        : `presence-channel-${channelId}`;
      
      const channel = pusherClient.channel(channelName);
      if (channel) {
        channel.trigger('client-typing', {
          userId: session.user.id,
          name: session.user.name
        });
      }
    }, 500),
    [channelId, userId, session?.user]
  );

  // Clean up typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.entries(updated).forEach(([userId, data]) => {
          if (now - data.timestamp > 2000) {
            delete updated[userId];
            changed = true;
          }
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (session?.user) {
      debouncedTyping();
    }
  };

  // Channel subscription and message handling
  useEffect(() => {
    if (!channelId && !userId) return;

    const channelName = channelId 
      ? `presence-channel-${channelId}`
      : `private-dm-${[currentUser.id, userId].sort().join('-')}`;

    console.log('Subscribing to channel:', channelName);
    const channel = pusherClient.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('Channel subscription succeeded:', members);
    });

    channel.bind('message:new', (message: any) => {
      console.log('New message received via Pusher:', message);
      setMessages((currentMessages) => [...currentMessages, message]);
    });

    return () => {
      console.log('Unsubscribing from channel:', channelName);
      pusherClient.unsubscribe(channelName);
    };
  }, [channelId, userId, currentUser.id]);

  const fetchMessages = async () => {
    if (!session?.user) return
    if (!channelId && !userId) {
      console.log('No channelId or userId provided for fetching messages')
      return
    }

    try {
      const endpoint = userId 
        ? `/api/direct-messages?userId=${userId}`
        : `/api/messages?channelId=${channelId}`

      console.log('Fetching messages from:', endpoint)

      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${await response.text()}`)
      }

      const data = await response.json()
      console.log('Received messages with user data:', data)
      setMessages(data)

    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  useEffect(() => {
    if (session?.user && (channelId || userId)) {
      fetchMessages()
    }
  }, [session?.user, channelId, userId])

  const renderMessage = (message: any) => {
    const isCurrentUser = message.senderId === currentUser.id;
    const displayName = message.senderName || 'Unknown User';
    
    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isCurrentUser ? 'bg-blue-500' : 'bg-gray-700'} rounded-lg p-3`}>
          <div className="text-sm text-gray-300">{displayName}</div>
          <div className="text-white">{message.content}</div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(message.createdAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  const sendMessage = async (content: string) => {
    try {
      const endpoint = channelId 
        ? '/api/messages' 
        : '/api/direct-messages';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          channelId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${await response.text()}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Return early if no channel or user is selected
  if (!channelId && !userId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a channel or user to start messaging</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => renderMessage(message))}
        {/* Add div for scroll reference */}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="text-sm text-gray-500 h-6 px-4">
        {Object.values(typingUsers).length > 0 && (
          <p>
            {Object.values(typingUsers)
              .map(user => user.name)
              .join(', ')}{' '}
            {Object.values(typingUsers).length === 1 ? 'is' : 'are'} typing...
          </p>
        )}
      </div>

      {/* Message input */}
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          if (newMessage.trim()) {
            await sendMessage(newMessage.trim());
            setNewMessage('');
            // Scroll to bottom after sending message
            scrollToBottom();
          }
        }} 
        className="p-4 border-t"
      >
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
    </div>
  )
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 