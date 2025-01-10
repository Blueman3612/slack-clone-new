'use client'

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useSession } from 'next-auth/react'
import { pusherClient } from '@/lib/pusher'
import { Message } from '@/types'
import MessageBubble from './MessageBubble'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'
import TypingIndicator from './TypingIndicator'
import ThreadView from './ThreadView'
import axios from 'axios'
import { FiPaperclip } from 'react-icons/fi';
import FilePreview from './FilePreview';
import SearchBar from './SearchBar';

export default function ChatInterface({ 
  chatId, 
  chatType, 
  currentUserId, 
  initialMessages = []
}: {
  chatId: string;
  chatType: 'channel' | 'dm';
  currentUserId: string;
  initialMessages: Message[];
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { onlineUsers } = useOnlineUsers();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentChannelRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatName, setChatName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');

  // Handle typing events
  const handleTyping = async () => {
    if (!chatId || !session?.user) return;

    const channelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${[currentUserId, chatId].sort().join('-')}`;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await axios.post('/api/pusher/trigger-event', {
        channel: channelName,
        event: 'typing',
        data: {
          userId: currentUserId,
          name: session.user.name || 'Anonymous'
        }
      });

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

  // Separate function for initial positioning (no animation)
  const positionAtBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Function for smooth scrolling to bottom (for new messages)
  const smoothScrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Position at bottom after messages load and render
  useLayoutEffect(() => {
    if (!isLoading && messages.length > 0) {
      // Give the browser a chance to paint
      const timer = setTimeout(positionAtBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, messages.length, positionAtBottom]);

  // Fetch messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/messages?${
          chatType === 'channel' ? 'channelId' : 'receiverId'
        }=${chatId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        const messagesWithCounts = data.map((msg: Message) => ({
          ...msg,
          replyCount: msg.replyCount || 0
        }));

        if (currentChannelRef.current === chatId) {
          setMessages(messagesWithCounts);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
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
    channel.bind('new-message', (newMessage: Message) => {
      if (currentChannelRef.current === chatId) {
        setMessages((currentMessages) => {
          if (currentMessages.some(m => m.id === newMessage.id)) {
            return currentMessages;
          }
          return [...currentMessages, newMessage];
        });
        smoothScrollToBottom();
      }
    });

    // Message deletion handler without auto-scroll
    channel.bind('message-deleted', ({ messageId, threadDeleted }: { messageId: string, threadDeleted: boolean }) => {
      if (currentChannelRef.current === chatId) {
        setMessages((currentMessages) => 
          currentMessages.filter(message => {
            // Remove the deleted message and all its replies if it's a thread
            if (threadDeleted) {
              return message.id !== messageId && message.parentId !== messageId;
            }
            // Just remove the single message
            return message.id !== messageId;
          })
        );

        // Close thread view if the deleted message was being viewed
        if (selectedThread?.id === messageId) {
          setSelectedThread(null);
        }
      }
    });

    // Handle thread updates
    channel.bind('update-thread', (data: {
      messageId: string;
      replyCount: number;
      lastReply: any;
    }) => {
      if (currentChannelRef.current === chatId) {
        setMessages((currentMessages) =>
          currentMessages.map((msg) => {
            if (msg.id === data.messageId) {
              return {
                ...msg,
                replyCount: data.replyCount,
                lastReply: data.lastReply
              };
            }
            return msg;
          })
        );
      }
    });

    // Handle reactions
    channel.bind('message-reaction', (data: {
      messageId: string;
      reaction: any;
      type: 'add' | 'remove';
    }) => {
      if (currentChannelRef.current === chatId) {
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
  }, [chatId, chatType, currentUserId, selectedThread?.id]);

  // Reset messages when changing chats
  useEffect(() => {
    setMessages([]);
    setTypingUsers([]);
    currentChannelRef.current = chatId;
  }, [chatId]);

  // Modify this effect to only scroll for new messages, not deletions
  useEffect(() => {
    if (messages.length > initialMessages.length) {
      smoothScrollToBottom();
    }
  }, [messages.length, initialMessages.length]);

  // Fetch chat name when component mounts or chatId changes
  useEffect(() => {
    const fetchChatName = async () => {
      try {
        if (chatType === 'channel') {
          const response = await fetch(`/api/channels/${chatId}`);
          if (!response.ok) throw new Error('Failed to fetch channel');
          const channel = await response.json();
          setChatName(`#${channel.name}`);
        } else {
          const response = await fetch(`/api/users/${chatId}`);
          if (!response.ok) throw new Error('Failed to fetch user');
          const user = await response.json();
          setChatName(user.name);
        }
      } catch (error) {
        console.error('Error fetching chat name:', error);
        setChatName('');
      }
    };

    fetchChatName();
  }, [chatId, chatType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    try {
      const response = await fetch('/api/messages', {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const uploadedFile = await response.json();
      
      // Send message with file attachment
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: '',
          fileUrl: uploadedFile.url,
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          fileSize: uploadedFile.size,
          ...(chatType === 'channel' 
            ? { channelId: chatId }
            : { receiverId: chatId }
          ),
        }),
      });
    } catch (error) {
      console.error('Upload error:', error);
      // You might want to add a toast notification here
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setCurrentSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/messages/search?${
        chatType === 'channel' ? 'channelId' : 'receiverId'
      }=${chatId}&query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search messages');
      }
      
      const data = await response.json();
      // Sort messages by creation date, oldest first
      const sortedResults = data.sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  // Add effect to scroll when search results change
  useEffect(() => {
    if (searchResults.length > 0 || currentSearchQuery === '') {
      scrollToBottom();
    }
  }, [searchResults, currentSearchQuery]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col h-full relative">
        <SearchBar onSearch={handleSearch} />
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        >
          {error && (
            <div className="p-4 text-red-500 text-center">
              {error}
            </div>
          )}
          {isLoading ? (
            <div className="p-4 text-center">
              Loading messages...
            </div>
          ) : (
            <div className="py-4">
              {isSearching ? (
                <div className="flex items-center justify-center h-16 text-gray-500">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-4">
                  <div className="px-4 pb-2 text-sm text-gray-500">
                    Found {searchResults.length} results
                  </div>
                  {searchResults.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.userId === currentUserId}
                      onlineUsers={onlineUsers}
                      onThreadClick={() => setSelectedThread(message)}
                      channelId={chatId}
                      chatType={chatType}
                      chatId={chatId}
                      searchQuery={currentSearchQuery}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : currentSearchQuery ? (
                <div className="flex items-center justify-center h-16 text-gray-500">
                  No results found
                </div>
              ) : (
                <div className="py-4">
                  {messages?.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.userId === currentUserId}
                      onlineUsers={onlineUsers}
                      onThreadClick={() => setSelectedThread(message)}
                      channelId={chatId}
                      chatType={chatType}
                      chatId={chatId}
                      searchQuery={currentSearchQuery}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <TypingIndicator typingUsers={typingUsers} />
          <form onSubmit={handleSubmit} className="p-4">
            <div className="relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={`Message ${chatName || 'the channel'}`}
                className="w-full p-3 pr-12 rounded-lg border dark:border-gray-600 
                         bg-white dark:bg-gray-800 
                         text-gray-900 dark:text-white
                         placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                disabled={isUploading}
              >
                <FiPaperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {isUploading && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Uploading file...
              </div>
            )}
          </form>
        </div>
      </div>

      {selectedThread && (
        <div className="flex-shrink-0 overflow-hidden border-l border-gray-200 dark:border-gray-700">
          <ThreadView
            parentMessage={selectedThread}
            onClose={() => setSelectedThread(null)}
            chatType={chatType}
            chatId={chatId}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </div>
  );
} 