'use client'

import { useState, useEffect, useRef } from 'react'
import { pusherClient, isClient } from '@/lib/pusher'
import { Message, User, Reaction } from '@prisma/client'
import MessageBubble from './MessageBubble'

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
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
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
        setMessages(data);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    const channelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${[currentUserId, chatId].sort().join('-')}`;

    const channel = pusherClient.subscribe(channelName);
    
    channel.bind('new-message', (newMessage: ExtendedMessage) => {
      setMessages((currentMessages) => {
        if (currentMessages.some(m => m.id === newMessage.id)) {
          return currentMessages;
        }
        return [...currentMessages, newMessage];
      });
      scrollToBottom();
    });

    channel.bind('message-reaction', (data: {
      messageId: string;
      reaction: Reaction & {
        user: {
          id: string;
          name: string | null;
          image: string | null;
        };
      };
      type: 'add' | 'remove';
    }) => {
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
    });

    return () => {
      pusherClient.unsubscribe(channelName);
      channel.unbind_all();
    };
  }, [chatId, chatType, currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      console.log('Sending message:', { chatType, chatId, message });

      const endpoint = chatType === 'channel' ? '/api/messages' : '/api/direct-messages';
      const body = chatType === 'channel' 
        ? { content: message, channelId: chatId }
        : { content: message, receiverId: chatId };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send message: ${error}`);
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
            />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <form onSubmit={handleSubmit} className="p-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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