'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Message } from '@/types'
import MessageBubble from './MessageBubble'
import { X } from 'lucide-react'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'
import { usePusher } from '@/contexts/PusherContext'
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
  const { subscribeToChannel, unsubscribeFromChannel } = usePusher()

  // Handle typing events
  const handleTyping = async () => {
    if (!session?.user) return;

    const channelName = `presence-thread-${parentMessage.id}`;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Send typing event
      await axios.post('/api/pusher/trigger-event', {
        channel: channelName,
        event: 'client-typing',
        data: {
          userId: currentUserId,
          name: session.user.name || 'Anonymous'
        }
      });

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(async () => {
        await axios.post('/api/pusher/trigger-event', {
          channel: channelName,
          event: 'client-stop-typing',
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
    const channelName = `presence-thread-${parentMessage.id}`;

    const handlers = {
      onNewMessage: (reply: Message & { type?: 'message-delete', messageId?: string }) => {
        if (reply.type === 'message-delete') {
          setMessages(current => current.filter(msg => msg.id !== reply.messageId));
          setParentMessage(prev => ({
            ...prev,
            replyCount: Math.max(0, (prev.replyCount || 0) - 1)
          }));
          return;
        }

        setMessages(current => {
          if (current.some(msg => msg.id === reply.id)) {
            return current;
          }
          return [...current, reply];
        });
        scrollToBottom();
      },
      onTyping: (data: { userId: string; name: string }) => {
        if (data.userId !== currentUserId) {
          setTypingUsers((users) => {
            if (!users.includes(data.name)) {
              return [...users, data.name];
            }
            return users;
          });
        }
      },
      onStopTyping: (data: { userId: string; name: string }) => {
        if (data.userId !== currentUserId) {
          setTypingUsers((users) => 
            users.filter(name => name !== data.name)
          );
        }
      },
      onThreadUpdate: (data: { replyCount: number }) => {
        setParentMessage(prev => ({
          ...prev,
          replyCount: data.replyCount
        }));
      },
      onReaction: (data: { messageId: string; reaction: any; type: 'add' | 'remove' }) => {
        const updateReactions = (message: Message) => {
          if (message.id !== data.messageId) return message;
          
          const currentReactions = message.reactions || [];
          if (data.type === 'add') {
            // Only add if not already present
            if (!currentReactions.some(r => r.id === data.reaction.id)) {
              return {
                ...message,
                reactions: [...currentReactions, data.reaction]
              };
            }
          } else {
            // Remove reaction
            return {
              ...message,
              reactions: currentReactions.filter(r => {
                if (data.reaction.id) {
                  return r.id !== data.reaction.id;
                }
                return !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId);
              })
            };
          }
          return message;
        };

        // Update parent message if it's the target
        if (data.messageId === parentMessage.id) {
          setParentMessage(prev => updateReactions(prev));
        }

        // Update thread messages if one is the target
        setMessages(current => current.map(msg => updateReactions(msg)));
      }
    };

    subscribeToChannel(channelName, handlers);

    return () => {
      unsubscribeFromChannel(channelName);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, parentMessage.id, subscribeToChannel, unsubscribeFromChannel]);

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
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Parent message */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <MessageBubble
          message={parentMessage}
          isOwn={parentMessage.userId === currentUserId}
          showThread={false}
          chatType={chatType}
          chatId={chatId}
        />
      </div>

      {/* Thread messages */}
      <div className="flex-1 overflow-y-auto p-4" key="thread-messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.userId === currentUserId}
            showThread={false}
            chatType={chatType}
            chatId={chatId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Reply in thread..."
          className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 
                   bg-white dark:bg-gray-800 
                   text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
    </div>
  );
}