'use client'

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
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
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

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
  const router = useRouter();
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

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
  }, [chatId, chatType, currentUserId]);

  // Reset messages when changing chats
  useEffect(() => {
    setMessages([]);
    setTypingUsers([]);
    currentChannelRef.current = chatId;
  }, [chatId]);

  // Modify this effect to not scroll when opening threads
  useEffect(() => {
    if (messages.length > initialMessages.length && !selectedThread) {
      smoothScrollToBottom();
    }
  }, [messages.length, initialMessages.length, selectedThread]);

  // Fetch chat name when component mounts or chatId changes
  useEffect(() => {
    const fetchChatName = async () => {
      if (!chatId) return;

      try {
        if (chatType === 'channel') {
          const response = await fetch(`/api/channels/${chatId}`);
          if (!response.ok) {
            console.error('Failed to fetch channel:', await response.text());
            throw new Error('Failed to fetch channel');
          }
          const channel = await response.json();
          setChatName(`#${channel.name}`);
        } else {
          const response = await fetch(`/api/users/${chatId}`);
          if (!response.ok) {
            console.error('Failed to fetch user:', await response.text());
            throw new Error('Failed to fetch user');
          }
          const user = await response.json();
          setChatName(user.name || 'Unknown User');
        }
      } catch (error) {
        console.error('Error fetching chat name:', error);
        setChatName(chatType === 'channel' ? '#unknown-channel' : 'Unknown User');
        setError(`Failed to fetch ${chatType === 'channel' ? 'channel' : 'user'} information`);
      }
    };

    fetchChatName();
  }, [chatId, chatType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    try {
      const payload = {
        content: message,
        ...(chatType === 'channel' 
          ? { channelId: chatId }
          : { receiverId: chatId }
        ),
      };

      console.log('Sending message payload:', payload);

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        console.error('Server error:', data);
        throw new Error(data?.error || 'Failed to send message');
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
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

  const handleSearch = async (query: string, results: any) => {
    console.log('Search results:', {
      query,
      resultCount: Object.keys(results).length,
      groups: Object.entries(results).map(([key, group]: [string, any]) => ({
        key,
        type: group.type,
        name: group.name,
        messageCount: group.messages.length,
        messages: group.messages.map((m: any) => ({
          id: m.id,
          content: m.content,
          channelId: m.channelId,
          userId: m.userId
        }))
      }))
    });
    
    setSearchResults(results);
    setCurrentSearchQuery(query);
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

  // Add useEffect to scroll to top when search results change
  useEffect(() => {
    if (searchResults.length > 0) {
      chatContainerRef.current?.scrollTo({ top: 0 });
    }
  }, [searchResults]);

  // Add useEffect to clear search when chatId or chatType changes
  useEffect(() => {
    setSearchResults([]);
    setCurrentSearchQuery('');
  }, [chatId, chatType]);

  const handleSearchMessageClick = async (message: Message) => {
    // Set the pending message ID before navigation
    setPendingMessageId(message.id);
    setShouldScrollToBottom(false);

    // Clear search results
    setSearchResults([]);
    setCurrentSearchQuery('');

    // For DMs, determine the correct user ID
    if (!message.channelId && message.receiverId) {
      const dmPartnerId = message.userId === currentUserId ? message.receiverId : message.userId;
      router.push(`/chat?userId=${dmPartnerId}`);
    } else if (message.channelId) {
      // For channels
      router.push(`/chat?channelId=${message.channelId}`);
    }
  };

  // Modify scroll behavior to respect priorities
  useEffect(() => {
    if (pendingMessageId) {
      const messageElement = document.getElementById(`message-${pendingMessageId}`);
      if (messageElement) {
        setTimeout(() => {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900');
          setTimeout(() => {
            messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900');
            setPendingMessageId(null);
          }, 2000);
        }, 100);
      }
    } else if (shouldScrollToBottom && messages.length > initialMessages.length && !currentSearchQuery) {
      // Only scroll to bottom for new messages
      scrollToBottom();
    }
  }, [messages, pendingMessageId, currentSearchQuery, shouldScrollToBottom, chatId]);

  // Modify the effect that handles new messages
  useEffect(() => {
    if (!pendingMessageId && !currentSearchQuery && messages.length > initialMessages.length) {
      setShouldScrollToBottom(true);
    }
  }, [messages.length, initialMessages.length, pendingMessageId, currentSearchQuery]);

  // Update the thread click handler
  const handleThreadClick = (message: Message) => {
    setSelectedThread(message);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex flex-col h-full flex-1 min-w-0 bg-gray-50 dark:bg-gray-800">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SearchBar onSearch={handleSearch} />
              </div>
              <button
                onClick={() => signOut()}
                className="ml-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {error && (
            <div className="p-4 text-red-500 text-center">{error}</div>
          )}
          {isLoading ? (
            <div className="p-4 text-center">Loading messages...</div>
          ) : (
            <div className="py-4">
              {isSearching ? (
                <div className="flex items-center justify-center h-16 text-gray-500">
                  Searching...
                </div>
              ) : currentSearchQuery && searchResults.length > 0 ? (
                <div className="flex flex-col space-y-4 p-4">
                  {searchResults.map((group) => (
                    <div key={group.key} className="border-b dark:border-gray-700 pb-4">
                      <div className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
                        {group.type === 'channel' ? '# ' : '🔒 '}
                        {group.name}
                        <span className="ml-2 text-xs text-gray-500">
                          {group.messageCount} {group.messageCount === 1 ? 'result' : 'results'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.messages.map((message: Message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.userId === currentUserId}
                            onThreadClick={() => setSelectedThread(message)}
                            chatType={chatType}
                            chatId={chatId}
                            searchQuery={currentSearchQuery}
                            isSearchResult={true}
                            onMessageClick={() => handleSearchMessageClick(message)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentSearchQuery ? (
                <div className="flex items-center justify-center p-4 text-gray-500">
                  No results found for "{currentSearchQuery}"
                </div>
              ) : (
                // Regular message display
                <div>
                  {messages?.map((message) => (
                    <div key={message.id} id={`message-${message.id}`}>
                      <MessageBubble
                        message={message}
                        isOwn={message.userId === currentUserId}
                        onThreadClick={() => setSelectedThread(message)}
                        chatType={chatType}
                        chatId={chatId}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <TypingIndicator typingUsers={typingUsers} />
          <form onSubmit={handleSubmit} className="p-4">
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={`Message ${chatName || 'the channel'}`}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 
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
        <div className="w-[40rem] border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
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