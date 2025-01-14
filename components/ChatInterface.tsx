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
import { createBluemanChat } from '@/lib/ai-chat';
import { highlightText } from '@/utils/highlightText';

interface Props {
  chatId: string;
  chatType: 'channel' | 'dm';
  currentUserId: string;
  initialMessages: Message[];
  initialLastReadTimestamp?: string;
}

export default function ChatInterface({ 
  chatId, 
  chatType, 
  currentUserId, 
  initialMessages = [],
  initialLastReadTimestamp
}: Props) {
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
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
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
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(
    initialLastReadTimestamp || null
  );
  const [isAIChat, setIsAIChat] = useState(false);
  const [isBluemanTyping, setIsBluemanTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isMessageSending, setIsMessageSending] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Add this function to parse timestamps safely
  const parseTimestamp = (timestamp: string | null): number => {
    if (!timestamp) return 0;
    // If it's already a number (stored as string), parse it directly
    if (!isNaN(Number(timestamp))) {
      return Number(timestamp);
    }
    // Otherwise try to parse as ISO date string
    return new Date(timestamp).getTime();
  };

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
    if (!isLoadingInitial && messages.length > 0 && !pendingMessageId && !currentSearchQuery) {
      const timer = setTimeout(positionAtBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingInitial, messages.length, positionAtBottom, pendingMessageId, currentSearchQuery]);

  // Fetch messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) return;
      
      // Only show loading on initial load when no messages exist
      if (messages.length === 0) {
        setIsLoadingInitial(true);
      }
      
      try {
        const response = await fetch(
          chatType === 'channel'
            ? `/api/messages?channelId=${chatId}`
            : `/api/messages?receiverId=${chatId}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
      } finally {
        setIsLoadingInitial(false);
      }
    };

    fetchMessages();
  }, [chatId, chatType]);

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

  // Add effect to check if this is an AI chat
  useEffect(() => {
    const checkIfAIChat = async () => {
      if (chatType === 'dm') {
        try {
          const response = await fetch(`/api/users/${chatId}`);
          const user = await response.json();
          setIsAIChat(user.isAI === true);
        } catch (error) {
          console.error('Error checking AI status:', error);
        }
      }
    };

    checkIfAIChat();
  }, [chatId, chatType]);

  // Add this function near the top of the component
  const isBluemanChat = useCallback(() => {
    // Check if this is a DM with Blueman AI
    return chatType === 'dm' && chatId === 'cm5vmlcru0001ujjcqeqz5743';
  }, [chatType, chatId]);

  // Modify the sendMessage function
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isMessageSending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: message.trim(),
      createdAt: new Date().toISOString(),
      userId: currentUserId,
    };

    // Optimistically add the message
    setMessages(prev => [...prev, tempMessage]);
    setMessage('');
    
    setIsMessageSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          chatType === 'channel' 
            ? {
                content: message.trim(),
                channelId: chatId
              }
            : {
                content: message.trim(),
                receiverId: chatId
              }
        ),
      });

      if (!response.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      // Replace temp message with real message
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));

      if (isBluemanChat()) {
        setIsBluemanTyping(true);
        try {
          const aiResponse = await fetch('/api/ai/blueman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message.trim() }),
          });

          const aiData = await aiResponse.json();
          if (aiData.response) {
            const bluemanResponse = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: aiData.response,
                receiverId: currentUserId,
                userId: chatId,
              }),
            });

            if (bluemanResponse.ok) {
              const bluemanMessageData = await bluemanResponse.json();
              setMessages(prev => [...prev, bluemanMessageData]);
            }
          }
        } catch (error) {
          console.error('Error in AI chat flow:', error);
        } finally {
          setIsBluemanTyping(false);
        }
      }
    } catch (error) {
      console.error('Error in message flow:', error);
    } finally {
      setIsMessageSending(false);
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
    setPendingMessageId(message.id);
    setShouldScrollToBottom(false);
    setHighlightedMessageId(message.id);
    
    setSearchResults([]);
    setCurrentSearchQuery('');

    // Remove highlight after animation
    setTimeout(() => setHighlightedMessageId(null), 2000);

    if (!message.channelId && message.receiverId) {
      const dmPartnerId = message.userId === currentUserId ? message.receiverId : message.userId;
      await router.push(`/chat?userId=${dmPartnerId}`);
    } else if (message.channelId) {
      await router.push(`/chat?channelId=${message.channelId}`);
    }
  };

  // Modify the scroll and highlight effect
  useEffect(() => {
    if (pendingMessageId) {
      // Give time for the new route to load and render
      const timer = setTimeout(() => {
        const messageElement = document.getElementById(`message-${pendingMessageId}`);
        if (messageElement) {
          // First scroll to the message
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Then add highlight with transition
          messageElement.classList.add(
            'bg-yellow-100',
            'dark:bg-yellow-900',
            'transition-all',
            'duration-1000'
          );

          // Remove highlight after delay but keep scroll position
          setTimeout(() => {
            messageElement.classList.remove(
              'bg-yellow-100',
              'dark:bg-yellow-900',
              'transition-all',
              'duration-1000'
            );
            // Don't reset pendingMessageId to prevent auto-scroll
          }, 3000); // Increased duration to 3 seconds
        }
      }, 500); // Increased delay to ensure content is loaded

      return () => clearTimeout(timer);
    }
  }, [pendingMessageId]);

  // Modify the new messages scroll effect to be more strict
  useEffect(() => {
    // Only scroll for new messages if we're not viewing a search result
    if (!pendingMessageId && 
        shouldScrollToBottom && 
        messages.length > initialMessages.length && 
        !currentSearchQuery) {
      const isNewMessage = messages[messages.length - 1]?.createdAt > 
        new Date(Date.now() - 1000).toISOString();
      
      if (isNewMessage) {
        scrollToBottom();
      }
    }
  }, [messages, shouldScrollToBottom, pendingMessageId, initialMessages.length, scrollToBottom, currentSearchQuery]);

  // Modify the effect that handles new messages
  useEffect(() => {
    // Only set shouldScrollToBottom for truly new messages, not when loading from search
    if (!pendingMessageId && !currentSearchQuery && messages.length > initialMessages.length) {
      const isNewMessage = messages[messages.length - 1]?.createdAt > 
        new Date(Date.now() - 1000).toISOString(); // Message created in last second
      
      if (isNewMessage) {
        setShouldScrollToBottom(true);
      }
    }
  }, [messages.length, initialMessages.length, pendingMessageId, currentSearchQuery, messages]);

  // Update the thread click handler
  const handleThreadClick = (message: Message) => {
    setSelectedThread(message);
  };

  // Add this function to handle scrolling to unread messages
  const scrollToUnreadLine = () => {
    const unreadMarker = document.querySelector('.unread-messages-line');
    if (unreadMarker) {
      unreadMarker.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Add this effect to scroll to unread line when it appears
  useEffect(() => {
    if (lastReadTimestamp) {
      scrollToUnreadLine();
    }
  }, [lastReadTimestamp]);

  // Add this effect to update last read timestamp when leaving the channel
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        const lastMessageTime = new Date(messages[messages.length - 1].createdAt).getTime();
        console.log('Storing last read timestamp:', lastMessageTime);
        localStorage.setItem(`lastRead_${chatId}`, lastMessageTime.toString());
      }
    };
  }, [chatId, messages]);

  // Update the timestamp loading effect
  useEffect(() => {
    const storedTimestamp = localStorage.getItem(`lastRead_${chatId}`);
    console.log('Loading stored timestamp:', {
      chatId,
      storedTimestamp,
      parsed: parseTimestamp(storedTimestamp)
    });
    if (storedTimestamp) {
      setLastReadTimestamp(storedTimestamp);
    }
  }, [chatId]);

  // Add this effect for real-time message updates
  useEffect(() => {
    if (!chatId) return;

    const channelName = chatType === 'channel'
      ? `channel-${chatId}`
      : `dm-${[currentUserId, chatId].sort().join('-')}`;

    console.log('Subscribing to Pusher channel:', channelName);
    
    const channel = pusherClient.subscribe(channelName);

    // Handle new messages
    channel.bind('new-message', (newMessage: Message) => {
      console.log('Received new message:', newMessage);
      setMessages(prev => {
        // Don't add messages from ourselves (handled by optimistic update)
        if (newMessage.userId === currentUserId) {
          return prev;
        }
        // Avoid duplicate messages
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    });

    // Handle typing events
    channel.bind('typing', (data: { userId: string; name: string }) => {
      console.log('Typing event received:', data);
      if (data.userId !== currentUserId) {
        setTypingUsers(users => {
          if (!users.includes(data.name)) {
            return [...users, data.name];
          }
          return users;
        });
      }
    });

    channel.bind('stop-typing', (data: { userId: string; name: string }) => {
      console.log('Stop typing event received:', data);
      if (data.userId !== currentUserId) {
        setTypingUsers(users => users.filter(name => name !== data.name));
      }
    });

    // Handle message deletions
    channel.bind('message-deleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    return () => {
      console.log('Unsubscribing from Pusher channel:', channelName);
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [chatId, chatType, currentUserId]);

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

        {currentSearchQuery ? (
          <div className="flex-1 overflow-y-auto">
            {Object.keys(searchResults).length > 0 ? (
              Object.entries(searchResults).map(([groupKey, group]: [string, any]) => (
                <div key={groupKey} className="border-b dark:border-gray-700">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      {group.type === 'channel' ? `#${group.name}` : group.name}
                    </h3>
                    <div className="space-y-2">
                      {group.messages.map((message: Message) => (
                        <button
                          key={message.id}
                          onClick={() => handleSearchMessageClick(message)}
                          className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <img
                              src={message.user?.image || '/default-avatar.png'}
                              alt={message.user?.name || 'User'}
                              className="w-5 h-5 rounded-full"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {message.user?.name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {highlightText(message.content, currentSearchQuery)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">
                  No results found for "{currentSearchQuery}"
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
              {isLoadingInitial ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading messages...
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-500">{error}</div>
                </div>
              ) : (
                <div>
                  {messages?.map((message, index) => {
                    const messageTime = new Date(message.createdAt).getTime();
                    const prevMessageTime = messages[index - 1] 
                      ? new Date(messages[index - 1].createdAt).getTime() 
                      : 0;
                    const lastReadTime = parseTimestamp(lastReadTimestamp);

                    const showUnreadLine = lastReadTimestamp && 
                      prevMessageTime < lastReadTime && 
                      messageTime > lastReadTime;

                    // Add more detailed debug logging
                    console.log('Message timestamp check:', {
                      messageId: message.id,
                      messageTime,
                      prevMessageTime,
                      lastReadTime,
                      lastReadTimestamp,
                      showUnreadLine,
                      comparison: {
                        prevLessThanRead: prevMessageTime < lastReadTime,
                        msgGreaterThanRead: messageTime > lastReadTime
                      }
                    });

                    return (
                      <div key={message.id}>
                        {showUnreadLine && (
                          <div className="relative my-4 unread-messages-line">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t-2 border-red-500" />
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-gray-800 px-2 text-xs text-red-500 font-semibold">
                                New Messages
                              </span>
                            </div>
                          </div>
                        )}
                        <MessageBubble
                          message={message}
                          isOwn={message.userId === currentUserId}
                          onThreadClick={() => setSelectedThread(message)}
                          chatType={chatType}
                          chatId={chatId}
                          isHighlighted={message.id === highlightedMessageId}
                        />
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
              {(typingUsers.length > 0 || isBluemanTyping) && (
                <div className="px-4 py-2">
                  <TypingIndicator 
                    typingUsers={isBluemanTyping ? ['Blueman AI'] : typingUsers} 
                  />
                </div>
              )}
              
              <form onSubmit={sendMessage} className="p-4">
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
          </>
        )}
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