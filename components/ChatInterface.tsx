'use client'

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Message, Reaction } from '@/types'
import MessageBubble from './MessageBubble'
import { useOnlineUsers } from '@/contexts/OnlineUsersContext'
import { usePusher } from '@/contexts/PusherContext'
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

// Add debug function at the top level
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    const message = args[0];
    const isCritical = 
      message.includes('Error:') || 
      message.includes('failed') ||
      message.includes('reaction');
      
    if (isCritical) {
      console.debug('[ChatInterface]', ...args);
    }
  }
};

interface Props {
  chatId: string;
  chatType: 'channel' | 'dm';
  currentUserId: string;
  initialMessages: Message[];
  initialLastReadTimestamp?: string;
}

interface ThreadMessage extends Message {
  reactions: Reaction[];
}

interface MessageWithThread extends Message {
  threadMessages?: ThreadMessage[];
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
  const { subscribeToChannel, unsubscribeFromChannel } = usePusher();
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Add this helper function at the top of the component
  const getMessageDate = (message: Message): Date => {
    return new Date(message.createdAt);
  };

  // Update the comparison functions
  const isMessageAfterTimestamp = (message: Message, timestamp: string) => {
    if (!timestamp) return false;
    const messageDate = new Date(message.createdAt).getTime();
    const compareDate = new Date(timestamp).getTime();
    return messageDate > compareDate;
  };

  // Add this function to parse timestamps safely
  const parseTimestamp = (timestamp: string | null): number => {
    if (!timestamp) return 0;
    const parsed = Number(timestamp);
    return !isNaN(parsed) ? parsed : new Date(timestamp).getTime();
  };

  // Handle typing events
  const handleTyping = async () => {
    if (!chatId || !session?.user) return;

    const channelName = chatType === 'channel'
      ? `presence-channel-${chatId}`
      : `presence-dm-${[currentUserId, chatId].sort().join('-')}`;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await axios.post('/api/pusher/trigger-event', {
        channel: channelName,
        event: 'client-typing',
        data: {
          userId: currentUserId,
          name: session.user.name || 'Anonymous'
        }
      });

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
        debug('Error: Failed to fetch messages -', error);
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
    
    // Clean up old subscription if it exists
    if (currentChannelRef.current && currentChannelRef.current !== chatId) {
      const oldChannel = currentChannelRef.current;
      debug(`Cleaning up old subscription for: ${oldChannel}`);
      unsubscribeFromChannel(oldChannel);
    }
    
    currentChannelRef.current = chatId;
  }, [chatId, unsubscribeFromChannel]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentChannelRef.current) {
        debug(`Cleaning up on unmount: ${currentChannelRef.current}`);
        unsubscribeFromChannel(currentChannelRef.current);
      }
    };
  }, [unsubscribeFromChannel]);

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
            debug('Error: Failed to fetch channel details');
            throw new Error('Failed to fetch channel');
          }
          const channel = await response.json();
          setChatName(`#${channel.name}`);
        } else {
          const response = await fetch(`/api/users/${chatId}`);
          if (!response.ok) {
            debug('Error: Failed to fetch user details');
            throw new Error('Failed to fetch user');
          }
          const user = await response.json();
          setChatName(user.name || 'Unknown User');
        }
      } catch (error) {
        debug('Error: Failed to fetch chat name -', error);
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
    if (!message.trim() || isMessageSending || !session?.user) return;

    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content: message.trim(),
      createdAt: now,
      updatedAt: now,
      userId: currentUserId,
      replyCount: 0,
      reactions: [],
      threadId: undefined,
      user: {
        id: currentUserId,
        name: session?.user?.name || 'Unknown',
        email: session?.user?.email || `user-${currentUserId}@example.com`,
        image: session?.user?.image || '',
        role: session?.user?.role
      },
      channelId: chatType === 'channel' ? chatId : undefined,
      receiverId: chatType === 'dm' ? chatId : undefined
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
          const response = await fetch('/api/ai/blueman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: message.trim()
            }),
          });

          if (!response.ok) throw new Error('Failed to get AI response');
          
          const data = await response.json();
          if (data.error) throw new Error(data.error);

          // Create the AI message
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            content: data.text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: chatId,
            replyCount: 0,
            reactions: [],
            threadId: undefined,
            user: {
              id: chatId,
              name: 'Blueman AI',
              email: 'blueman@ai.com',
              image: '/ai-avatars/blueman.png',
              role: 'AI'
            },
            channelId: undefined,
            receiverId: currentUserId
          };

          // Add the AI message to the chat
          setMessages(prev => [...prev, aiMessage]);

          // Store the message in the database
          const finalResponse = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: data.text,
              receiverId: currentUserId,
              userId: chatId,
            }),
          });

          if (finalResponse.ok) {
            const finalMessageData = await finalResponse.json();
            // Replace the temporary message with the final one
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiMessage.id ? finalMessageData : msg
              )
            );
          }
        } catch (error) {
          debug('Error: AI chat flow failed -', error);
        } finally {
          setIsBluemanTyping(false);
        }
      }
    } catch (error) {
      debug('Error: Failed to send message -', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
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
      debug('Error: File upload failed -', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (query: string, results: any) => {
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
      const isNewMessage = messages[messages.length - 1] && 
        messages[messages.length - 1].createdAt > 
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
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.createdAt > new Date(Date.now() - 1000).toISOString()) {
        setShouldScrollToBottom(true);
      }
    }
  }, [messages.length, initialMessages.length, pendingMessageId, currentSearchQuery, messages]);

  // Update the thread click handler
  const handleThreadClick = (message: Message) => {
    setSelectedThread(message);
  };

  // Add handler for closing thread
  const handleThreadClose = () => {
    setSelectedThread(null);
  };

  // Update the Pusher event handler
  useEffect(() => {
    if (!chatId || !session?.user) return;

    const channelName = chatType === 'channel' 
      ? `presence-channel-${chatId}` 
      : `presence-dm-${[currentUserId, chatId].sort().join('-')}`;
    
    debug(`Subscribing to channel: ${channelName}`);
    
    // Single subscription for all message updates
    const handlers = {
      onNewMessage: (data: any) => {
        if (data.type === 'message-delete') {
          debug('Received message deletion:', data);
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
          
          // If a thread was deleted, close the thread view
          if (data.threadDeleted && selectedThread?.id === data.messageId) {
            setSelectedThread(null);
          }
          return;
        }

        debug('Received new message:', data);
        setMessages(prev => {
          // Check if this is our own message that was just sent
          const tempMessage = prev.find(m => 
            m.id.startsWith('temp-') && 
            m.content === data.content &&
            m.userId === data.userId
          );

          // Check if we already have this message
          const existingMessage = prev.find(m => m.id === data.id);
          
          if (tempMessage) {
            // Replace our temporary message with the real one
            return prev.map(m => {
              if (m.id === tempMessage.id) {
                return {
                  ...data,
                  user: {
                    ...data.user,
                    role: data.user.role || session?.user?.role
                  },
                  reactions: data.reactions || []
                };
              }
              return m;
            });
          } else if (existingMessage) {
            // Update existing message while preserving user properties
            return prev.map(m => {
              if (m.id === data.id) {
                return {
                  ...m,
                  ...data,
                  user: {
                    ...m.user,
                    ...data.user,
                    role: data.user.role || m.user.role
                  },
                  reactions: data.reactions || []
                };
              }
              return m;
            });
          }
          
          // For thread messages, update the parent message's reply count
          if (data.threadId) {
            return prev.map(m => {
              if (m.id === data.threadId) {
                return {
                  ...m,
                  replyCount: (m.replyCount || 0) + 1,
                  lastReply: {
                    content: data.content,
                    user: data.user,
                    createdAt: data.createdAt
                  }
                };
              }
              return m;
            });
          }
          
          // This is a new non-thread message
          return [...prev, {
            ...data,
            user: {
              ...data.user,
              role: data.user.role
            },
            reactions: data.reactions || []
          }];
        });
      },
      onTyping: (data: { userId: string; name: string }) => {
        if (data.userId !== currentUserId) {
          setTypingUsers(prev => {
            if (!prev.includes(data.name)) {
              return [...prev, data.name];
            }
            return prev;
          });
        }
      },
      onStopTyping: (data: { userId: string; name: string }) => {
        if (data.userId !== currentUserId) {
          setTypingUsers(prev => prev.filter(name => name !== data.name));
        }
      },
      onReaction: (data: { messageId: string; reaction: Reaction; type: 'add' | 'remove' }) => {
        debug('Received reaction event:', data);
        if (!data?.messageId || !data?.reaction) {
          debug('Error: Invalid reaction data received:', data);
          return;
        }

        setMessages((prev: Message[]) => prev.map(message => {
          if (message.id === data.messageId) {
            const currentReactions = message.reactions || [];
            
            if (data.type === 'add') {
              // Only add if not already present
              if (!currentReactions.some(r => r.id === data.reaction.id)) {
                debug('Adding reaction:', data.reaction);
                return {
                  ...message,
                  reactions: [...currentReactions, data.reaction]
                };
              }
            } else if (data.type === 'remove') {
              debug('Removing reaction:', data.reaction);
              // First try to remove by ID
              if (data.reaction.id) {
                return {
                  ...message,
                  reactions: currentReactions.filter(r => r.id !== data.reaction.id)
                };
              }
              // Fallback to removing by emoji and userId if no ID
              return {
                ...message,
                reactions: currentReactions.filter(r => 
                  !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId)
                )
              };
            }
          }
          return message;
        }));

        // If we have a selected thread, update its messages too
        if (selectedThread) {
          setSelectedThread(prev => {
            if (!prev || prev.id !== data.messageId) return prev;
            
            const currentReactions = prev.reactions || [];
            
            if (data.type === 'add') {
              // Only add if not already present
              if (!currentReactions.some(r => r.id === data.reaction.id)) {
                debug('Adding reaction to thread message:', data.reaction);
                return {
                  ...prev,
                  reactions: [...currentReactions, data.reaction]
                };
              }
            } else if (data.type === 'remove') {
              debug('Removing reaction from thread message:', data.reaction);
              // First try to remove by ID
              if (data.reaction.id) {
                return {
                  ...prev,
                  reactions: currentReactions.filter(r => r.id !== data.reaction.id)
                };
              }
              // Fallback to removing by emoji and userId if no ID
              return {
                ...prev,
                reactions: currentReactions.filter(r => 
                  !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId)
                )
              };
            }
            return prev;
          });
        }
      },
      onThreadUpdate: (data: { 
        messageId: string;
        replyCount: number;
        lastReply: {
          content: string;
          user: any;
          createdAt: string;
        }
      }) => {
        setMessages(prev => prev.map(message => {
          if (message.id === data.messageId) {
            return {
              ...message,
              replyCount: data.replyCount,
              lastReply: data.lastReply
            };
          }
          return message;
        }));
      }
    };

    // Subscribe to the channel
    subscribeToChannel(channelName, handlers);

    // If we have a selected thread, also subscribe to the thread channel
    if (selectedThread) {
      const threadChannelName = `presence-thread-${selectedThread.id}`;
      subscribeToChannel(threadChannelName, handlers);
    }

    // Keep track of the subscription
    currentChannelRef.current = channelName;

    return () => {
      debug(`Cleaning up subscription for: ${channelName}`);
      // Only unsubscribe when changing chats
      if (chatId !== currentChannelRef.current) {
        unsubscribeFromChannel(channelName);
      }
      // Always unsubscribe from thread channel
      if (selectedThread) {
        unsubscribeFromChannel(`presence-thread-${selectedThread.id}`);
      }
    };
  }, [chatId, chatType, currentUserId, session?.user, subscribeToChannel, unsubscribeFromChannel, selectedThread]);

  // Update the useEffect for unread messages
  useEffect(() => {
    if (!lastReadTimestamp || messages.length === 0) return;

    const unreadMessages = messages.filter(msg => 
      msg.userId !== currentUserId && 
      isMessageAfterTimestamp(msg, lastReadTimestamp)
    );

    if (unreadMessages.length > 0) {
      // Handle unread messages...
    }
  }, [messages, lastReadTimestamp, currentUserId]);

  const handleReactionAdd = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch('/api/messages/reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          emoji,
          chatType,
          chatId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }
    } catch (error) {
      debug('Error: Failed to add reaction -', error);
    }
  };

  const handleReactionRemove = async (messageId: string, reactionId: string) => {
    try {
      const response = await fetch(`/api/messages/reaction?reactionId=${reactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatType,
          chatId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }
    } catch (error) {
      debug('Error: Failed to remove reaction -', error);
    }
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
                  {messages.map((msg, index) => {
                    const messageDate = getMessageDate(msg);
                    const lastReadTime = parseTimestamp(lastReadTimestamp);
                    const nextMessage = messages[index + 1];
                    const showUnreadLine = lastReadTimestamp &&
                      msg.userId !== currentUserId &&
                      messageDate.getTime() > lastReadTime &&
                      (!nextMessage || getMessageDate(nextMessage).getTime() <= lastReadTime);

                    return (
                      <div key={msg.id}>
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isOwn={msg.userId === currentUserId}
                          onThreadClick={() => handleThreadClick(msg)}
                          chatType={chatType}
                          chatId={chatId}
                          searchQuery={currentSearchQuery}
                          isHighlighted={msg.id === highlightedMessageId}
                          onReactionAdd={handleReactionAdd}
                          onReactionRemove={handleReactionRemove}
                        />
                        {showUnreadLine && (
                          <div className="unread-messages-line border-t-2 border-red-500 my-2 relative">
                            <span className="absolute -top-3 left-4 bg-red-500 text-white px-2 py-0.5 rounded text-xs">
                              New Messages
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
              <div className="px-4 pt-1.5 min-h-[22px]">
                {(typingUsers.length > 0 || isBluemanTyping) && (
                  <TypingIndicator 
                    typingUsers={isBluemanTyping ? ['Blueman AI'] : typingUsers} 
                  />
                )}
              </div>
              <form onSubmit={sendMessage} className="p-4 pt-2">
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
            onClose={handleThreadClose}
            chatType={chatType}
            chatId={chatId}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </div>
  );
} 