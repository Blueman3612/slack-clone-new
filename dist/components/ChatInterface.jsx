"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatInterface;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const MessageBubble_1 = __importDefault(require("./MessageBubble"));
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
const PusherContext_1 = require("@/contexts/PusherContext");
const TypingIndicator_1 = __importDefault(require("./TypingIndicator"));
const ThreadView_1 = __importDefault(require("./ThreadView"));
const axios_1 = __importDefault(require("axios"));
const fi_1 = require("react-icons/fi");
const SearchBar_1 = __importDefault(require("./SearchBar"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const highlightText_1 = require("@/utils/highlightText");
// Add debug function at the top level
const debug = (...args) => {
    if (process.env.NODE_ENV === 'development') {
        const message = args[0];
        const isCritical = message.includes('Error:') ||
            message.includes('failed') ||
            message.includes('reaction');
        if (isCritical) {
            console.debug('[ChatInterface]', ...args);
        }
    }
};
function ChatInterface({ chatId, chatType, currentUserId, initialMessages = [], initialLastReadTimestamp }) {
    const { data: session } = (0, react_2.useSession)();
    const [messages, setMessages] = (0, react_1.useState)(initialMessages);
    const [message, setMessage] = (0, react_1.useState)('');
    const [typingUsers, setTypingUsers] = (0, react_1.useState)([]);
    const { onlineUsers } = (0, OnlineUsersContext_1.useOnlineUsers)();
    const messagesEndRef = (0, react_1.useRef)(null);
    const chatContainerRef = (0, react_1.useRef)(null);
    const currentChannelRef = (0, react_1.useRef)(null);
    const typingTimeoutRef = (0, react_1.useRef)();
    const [selectedThread, setSelectedThread] = (0, react_1.useState)(null);
    const [isLoadingInitial, setIsLoadingInitial] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [chatName, setChatName] = (0, react_1.useState)('');
    const [isUploading, setIsUploading] = (0, react_1.useState)(false);
    const fileInputRef = (0, react_1.useRef)(null);
    const [searchResults, setSearchResults] = (0, react_1.useState)([]);
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    const [currentSearchQuery, setCurrentSearchQuery] = (0, react_1.useState)('');
    const router = (0, navigation_1.useRouter)();
    const [pendingMessageId, setPendingMessageId] = (0, react_1.useState)(null);
    const [shouldScrollToBottom, setShouldScrollToBottom] = (0, react_1.useState)(true);
    const [lastReadTimestamp, setLastReadTimestamp] = (0, react_1.useState)(initialLastReadTimestamp || null);
    const [isAIChat, setIsAIChat] = (0, react_1.useState)(false);
    const [isBluemanTyping, setIsBluemanTyping] = (0, react_1.useState)(false);
    const [isLoadingMessages, setIsLoadingMessages] = (0, react_1.useState)(false);
    const [isMessageSending, setIsMessageSending] = (0, react_1.useState)(false);
    const [highlightedMessageId, setHighlightedMessageId] = (0, react_1.useState)(null);
    const { subscribeToChannel, unsubscribeFromChannel } = (0, PusherContext_1.usePusher)();
    const [streamingMessage, setStreamingMessage] = (0, react_1.useState)('');
    const [streamingMessageId, setStreamingMessageId] = (0, react_1.useState)(null);
    // Add this helper function at the top of the component
    const getMessageDate = (message) => {
        return new Date(message.createdAt);
    };
    // Update the comparison functions
    const isMessageAfterTimestamp = (message, timestamp) => {
        if (!timestamp)
            return false;
        const messageDate = new Date(message.createdAt).getTime();
        const compareDate = new Date(timestamp).getTime();
        return messageDate > compareDate;
    };
    // Add this function to parse timestamps safely
    const parseTimestamp = (timestamp) => {
        if (!timestamp)
            return 0;
        const parsed = Number(timestamp);
        return !isNaN(parsed) ? parsed : new Date(timestamp).getTime();
    };
    // Handle typing events
    const handleTyping = async () => {
        if (!chatId || !(session === null || session === void 0 ? void 0 : session.user))
            return;
        const channelName = chatType === 'channel'
            ? `presence-channel-${chatId}`
            : `presence-dm-${[currentUserId, chatId].sort().join('-')}`;
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        try {
            await axios_1.default.post('/api/pusher/trigger-event', {
                channel: channelName,
                event: 'client-typing',
                data: {
                    userId: currentUserId,
                    name: session.user.name || 'Anonymous'
                }
            });
            typingTimeoutRef.current = setTimeout(async () => {
                await axios_1.default.post('/api/pusher/trigger-event', {
                    channel: channelName,
                    event: 'client-stop-typing',
                    data: {
                        userId: currentUserId,
                        name: session.user.name || 'Anonymous'
                    }
                });
            }, 2000);
        }
        catch (error) {
            console.error('Error sending typing event:', error);
        }
    };
    // Separate function for initial positioning (no animation)
    const positionAtBottom = (0, react_1.useCallback)(() => {
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
    (0, react_1.useLayoutEffect)(() => {
        if (!isLoadingInitial && messages.length > 0 && !pendingMessageId && !currentSearchQuery) {
            const timer = setTimeout(positionAtBottom, 100);
            return () => clearTimeout(timer);
        }
    }, [isLoadingInitial, messages.length, positionAtBottom, pendingMessageId, currentSearchQuery]);
    // Fetch messages when chat changes
    (0, react_1.useEffect)(() => {
        const fetchMessages = async () => {
            if (!chatId)
                return;
            // Only show loading on initial load when no messages exist
            if (messages.length === 0) {
                setIsLoadingInitial(true);
            }
            try {
                const response = await fetch(chatType === 'channel'
                    ? `/api/messages?channelId=${chatId}`
                    : `/api/messages?receiverId=${chatId}`);
                if (!response.ok)
                    throw new Error('Failed to fetch messages');
                const data = await response.json();
                setMessages(data);
            }
            catch (error) {
                debug('Error: Failed to fetch messages -', error);
                setError('Failed to load messages');
            }
            finally {
                setIsLoadingInitial(false);
            }
        };
        fetchMessages();
    }, [chatId, chatType]);
    // Reset messages when changing chats
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        return () => {
            if (currentChannelRef.current) {
                debug(`Cleaning up on unmount: ${currentChannelRef.current}`);
                unsubscribeFromChannel(currentChannelRef.current);
            }
        };
    }, [unsubscribeFromChannel]);
    // Modify this effect to not scroll when opening threads
    (0, react_1.useEffect)(() => {
        if (messages.length > initialMessages.length && !selectedThread) {
            smoothScrollToBottom();
        }
    }, [messages.length, initialMessages.length, selectedThread]);
    // Fetch chat name when component mounts or chatId changes
    (0, react_1.useEffect)(() => {
        const fetchChatName = async () => {
            if (!chatId)
                return;
            try {
                if (chatType === 'channel') {
                    const response = await fetch(`/api/channels/${chatId}`);
                    if (!response.ok) {
                        debug('Error: Failed to fetch channel details');
                        throw new Error('Failed to fetch channel');
                    }
                    const channel = await response.json();
                    setChatName(`#${channel.name}`);
                }
                else {
                    const response = await fetch(`/api/users/${chatId}`);
                    if (!response.ok) {
                        debug('Error: Failed to fetch user details');
                        throw new Error('Failed to fetch user');
                    }
                    const user = await response.json();
                    setChatName(user.name || 'Unknown User');
                }
            }
            catch (error) {
                debug('Error: Failed to fetch chat name -', error);
                setChatName(chatType === 'channel' ? '#unknown-channel' : 'Unknown User');
                setError(`Failed to fetch ${chatType === 'channel' ? 'channel' : 'user'} information`);
            }
        };
        fetchChatName();
    }, [chatId, chatType]);
    // Add effect to check if this is an AI chat
    (0, react_1.useEffect)(() => {
        const checkIfAIChat = async () => {
            if (chatType === 'dm') {
                try {
                    const response = await fetch(`/api/users/${chatId}`);
                    const user = await response.json();
                    setIsAIChat(user.isAI === true);
                }
                catch (error) {
                    console.error('Error checking AI status:', error);
                }
            }
        };
        checkIfAIChat();
    }, [chatId, chatType]);
    // Add this function near the top of the component
    const isBluemanChat = (0, react_1.useCallback)(() => {
        // Check if this is a DM with Blueman AI
        return chatType === 'dm' && chatId === 'cm5vmlcru0001ujjcqeqz5743';
    }, [chatType, chatId]);
    // Modify the sendMessage function
    const sendMessage = async (e) => {
        var _a, _b, _c, _d;
        e.preventDefault();
        if (!message.trim() || isMessageSending || !(session === null || session === void 0 ? void 0 : session.user))
            return;
        const now = new Date().toISOString();
        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
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
                name: ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                email: ((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.email) || `user-${currentUserId}@example.com`,
                image: ((_c = session === null || session === void 0 ? void 0 : session.user) === null || _c === void 0 ? void 0 : _c.image) || '',
                role: (_d = session === null || session === void 0 ? void 0 : session.user) === null || _d === void 0 ? void 0 : _d.role
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
                body: JSON.stringify(chatType === 'channel'
                    ? {
                        content: message.trim(),
                        channelId: chatId
                    }
                    : {
                        content: message.trim(),
                        receiverId: chatId
                    }),
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
                    // Create a temporary message for streaming
                    const streamId = `stream-${Date.now()}`;
                    setStreamingMessageId(streamId);
                    setStreamingMessage('');
                    const tempStreamMessage = {
                        id: streamId,
                        content: '',
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
                    // Don't add the streaming message placeholder yet
                    let hasAddedMessage = false;
                    // Get the last 10 messages for context, excluding the temp message
                    const chatHistory = messages
                        .filter(msg => msg.id !== tempId)
                        .slice(-10)
                        .map(msg => ({
                        role: msg.userId === chatId ? 'assistant' : 'user',
                        content: msg.content
                    }));
                    // Add the current message to chat history
                    chatHistory.push({
                        role: 'user',
                        content: message.trim()
                    });
                    const response = await fetch('/api/ai/blueman', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message.trim()
                        }),
                    });
                    if (!response.ok)
                        throw new Error('Failed to get AI response');
                    if (!response.body)
                        throw new Error('No response body');
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let accumulatedResponse = '';
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done)
                                break;
                            const chunk = decoder.decode(value);
                            const lines = chunk.split('\n');
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const data = line.slice(5).trim();
                                    if (data === '[DONE]') {
                                        debug('Received [DONE] message');
                                        continue;
                                    }
                                    try {
                                        const parsed = JSON.parse(data);
                                        if (parsed.text) {
                                            accumulatedResponse += parsed.text;
                                            setStreamingMessage(accumulatedResponse);
                                            // Add the message to the chat if this is the first token
                                            if (!hasAddedMessage) {
                                                hasAddedMessage = true;
                                                setIsBluemanTyping(false); // Hide typing indicator when content starts
                                                setMessages(prev => [...prev, Object.assign(Object.assign({}, tempStreamMessage), { content: parsed.text })]);
                                            }
                                            else {
                                                // Update the streaming message in real-time
                                                setMessages(prev => prev.map(msg => msg.id === streamId
                                                    ? Object.assign(Object.assign({}, msg), { content: accumulatedResponse }) : msg));
                                            }
                                        }
                                    }
                                    catch (e) {
                                        // Only log parsing errors for non-[DONE] messages
                                        if (data !== '[DONE]') {
                                            debug('Error parsing streaming data:', e);
                                            console.error('Failed to parse:', data);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    finally {
                        reader.releaseLock();
                    }
                    // Send the final message to the server
                    if (accumulatedResponse) {
                        const finalResponse = await fetch('/api/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                content: accumulatedResponse,
                                receiverId: currentUserId,
                                userId: chatId,
                            }),
                        });
                        if (finalResponse.ok) {
                            const finalMessageData = await finalResponse.json();
                            // Replace the streaming message with the final one
                            setMessages(prev => prev.map(msg => msg.id === streamId ? finalMessageData : msg));
                        }
                    }
                }
                catch (error) {
                    debug('Error: AI chat flow failed -', error);
                    // Remove the streaming message if there was an error
                    if (streamingMessageId) {
                        setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
                    }
                }
                finally {
                    setIsBluemanTyping(false);
                    setStreamingMessageId(null);
                    setStreamingMessage('');
                }
            }
        }
        catch (error) {
            debug('Error: Failed to send message -', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
        finally {
            setIsMessageSending(false);
        }
    };
    const handleFileUpload = async (event) => {
        var _a;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file || !chatId)
            return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok)
                throw new Error('Upload failed');
            const uploadedFile = await response.json();
            // Send message with file attachment
            await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign({ content: '', fileUrl: uploadedFile.url, fileName: uploadedFile.name, fileType: uploadedFile.type, fileSize: uploadedFile.size }, (chatType === 'channel'
                    ? { channelId: chatId }
                    : { receiverId: chatId }))),
            });
        }
        catch (error) {
            debug('Error: File upload failed -', error);
        }
        finally {
            setIsUploading(false);
        }
    };
    const handleSearch = async (query, results) => {
        setSearchResults(results);
        setCurrentSearchQuery(query);
    };
    const scrollToBottom = (0, react_1.useCallback)(() => {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'instant' });
    }, []);
    // Add effect to scroll when search results change
    (0, react_1.useEffect)(() => {
        if (searchResults.length > 0 || currentSearchQuery === '') {
            scrollToBottom();
        }
    }, [searchResults, currentSearchQuery]);
    // Add useEffect to scroll to top when search results change
    (0, react_1.useEffect)(() => {
        var _a;
        if (searchResults.length > 0) {
            (_a = chatContainerRef.current) === null || _a === void 0 ? void 0 : _a.scrollTo({ top: 0 });
        }
    }, [searchResults]);
    // Add useEffect to clear search when chatId or chatType changes
    (0, react_1.useEffect)(() => {
        setSearchResults([]);
        setCurrentSearchQuery('');
    }, [chatId, chatType]);
    const handleSearchMessageClick = async (message) => {
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
        }
        else if (message.channelId) {
            await router.push(`/chat?channelId=${message.channelId}`);
        }
    };
    // Modify the scroll and highlight effect
    (0, react_1.useEffect)(() => {
        if (pendingMessageId) {
            // Give time for the new route to load and render
            const timer = setTimeout(() => {
                const messageElement = document.getElementById(`message-${pendingMessageId}`);
                if (messageElement) {
                    // First scroll to the message
                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Then add highlight with transition
                    messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900', 'transition-all', 'duration-1000');
                    // Remove highlight after delay but keep scroll position
                    setTimeout(() => {
                        messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900', 'transition-all', 'duration-1000');
                        // Don't reset pendingMessageId to prevent auto-scroll
                    }, 3000); // Increased duration to 3 seconds
                }
            }, 500); // Increased delay to ensure content is loaded
            return () => clearTimeout(timer);
        }
    }, [pendingMessageId]);
    // Modify the new messages scroll effect to be more strict
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        // Only set shouldScrollToBottom for truly new messages, not when loading from search
        if (!pendingMessageId && !currentSearchQuery && messages.length > initialMessages.length) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.createdAt > new Date(Date.now() - 1000).toISOString()) {
                setShouldScrollToBottom(true);
            }
        }
    }, [messages.length, initialMessages.length, pendingMessageId, currentSearchQuery, messages]);
    // Update the thread click handler
    const handleThreadClick = (message) => {
        setSelectedThread(message);
    };
    // Add handler for closing thread
    const handleThreadClose = () => {
        setSelectedThread(null);
    };
    // Update the Pusher event handler
    (0, react_1.useEffect)(() => {
        if (!chatId || !(session === null || session === void 0 ? void 0 : session.user))
            return;
        const channelName = chatType === 'channel'
            ? `presence-channel-${chatId}`
            : `presence-dm-${[currentUserId, chatId].sort().join('-')}`;
        debug(`Subscribing to channel: ${channelName}`);
        // Single subscription for all message updates
        const handlers = {
            onNewMessage: (data) => {
                if (data.type === 'message-delete') {
                    debug('Received message deletion:', data);
                    setMessages(prev => prev.filter(m => m.id !== data.messageId));
                    // If a thread was deleted, close the thread view
                    if (data.threadDeleted && (selectedThread === null || selectedThread === void 0 ? void 0 : selectedThread.id) === data.messageId) {
                        setSelectedThread(null);
                    }
                    return;
                }
                debug('Received new message:', data);
                setMessages(prev => {
                    // Check if this is our own message that was just sent
                    const tempMessage = prev.find(m => m.id.startsWith('temp-') &&
                        m.content === data.content &&
                        m.userId === data.userId);
                    // Check if we already have this message
                    const existingMessage = prev.find(m => m.id === data.id);
                    if (tempMessage) {
                        // Replace our temporary message with the real one
                        return prev.map(m => {
                            var _a;
                            if (m.id === tempMessage.id) {
                                return Object.assign(Object.assign({}, data), { user: Object.assign(Object.assign({}, data.user), { role: data.user.role || ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.role) }), reactions: data.reactions || [] });
                            }
                            return m;
                        });
                    }
                    else if (existingMessage) {
                        // Update existing message while preserving user properties
                        return prev.map(m => {
                            if (m.id === data.id) {
                                return Object.assign(Object.assign(Object.assign({}, m), data), { user: Object.assign(Object.assign(Object.assign({}, m.user), data.user), { role: data.user.role || m.user.role }), reactions: data.reactions || [] });
                            }
                            return m;
                        });
                    }
                    // For thread messages, update the parent message's reply count
                    if (data.threadId) {
                        return prev.map(m => {
                            if (m.id === data.threadId) {
                                return Object.assign(Object.assign({}, m), { replyCount: (m.replyCount || 0) + 1, lastReply: {
                                        content: data.content,
                                        user: data.user,
                                        createdAt: data.createdAt
                                    } });
                            }
                            return m;
                        });
                    }
                    // This is a new non-thread message
                    return [...prev, Object.assign(Object.assign({}, data), { user: Object.assign(Object.assign({}, data.user), { role: data.user.role }), reactions: data.reactions || [] })];
                });
            },
            onTyping: (data) => {
                if (data.userId !== currentUserId) {
                    setTypingUsers(prev => {
                        if (!prev.includes(data.name)) {
                            return [...prev, data.name];
                        }
                        return prev;
                    });
                }
            },
            onStopTyping: (data) => {
                if (data.userId !== currentUserId) {
                    setTypingUsers(prev => prev.filter(name => name !== data.name));
                }
            },
            onReaction: (data) => {
                debug('Received reaction event:', data);
                if (!(data === null || data === void 0 ? void 0 : data.messageId) || !(data === null || data === void 0 ? void 0 : data.reaction)) {
                    debug('Error: Invalid reaction data received:', data);
                    return;
                }
                setMessages((prev) => prev.map(message => {
                    if (message.id === data.messageId) {
                        const currentReactions = message.reactions || [];
                        if (data.type === 'add') {
                            // Only add if not already present
                            if (!currentReactions.some(r => r.id === data.reaction.id)) {
                                debug('Adding reaction:', data.reaction);
                                return Object.assign(Object.assign({}, message), { reactions: [...currentReactions, data.reaction] });
                            }
                        }
                        else if (data.type === 'remove') {
                            debug('Removing reaction:', data.reaction);
                            // First try to remove by ID
                            if (data.reaction.id) {
                                return Object.assign(Object.assign({}, message), { reactions: currentReactions.filter(r => r.id !== data.reaction.id) });
                            }
                            // Fallback to removing by emoji and userId if no ID
                            return Object.assign(Object.assign({}, message), { reactions: currentReactions.filter(r => !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId)) });
                        }
                    }
                    return message;
                }));
                // If we have a selected thread, update its messages too
                if (selectedThread) {
                    setSelectedThread(prev => {
                        if (!prev || prev.id !== data.messageId)
                            return prev;
                        const currentReactions = prev.reactions || [];
                        if (data.type === 'add') {
                            // Only add if not already present
                            if (!currentReactions.some(r => r.id === data.reaction.id)) {
                                debug('Adding reaction to thread message:', data.reaction);
                                return Object.assign(Object.assign({}, prev), { reactions: [...currentReactions, data.reaction] });
                            }
                        }
                        else if (data.type === 'remove') {
                            debug('Removing reaction from thread message:', data.reaction);
                            // First try to remove by ID
                            if (data.reaction.id) {
                                return Object.assign(Object.assign({}, prev), { reactions: currentReactions.filter(r => r.id !== data.reaction.id) });
                            }
                            // Fallback to removing by emoji and userId if no ID
                            return Object.assign(Object.assign({}, prev), { reactions: currentReactions.filter(r => !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId)) });
                        }
                        return prev;
                    });
                }
            },
            onThreadUpdate: (data) => {
                setMessages(prev => prev.map(message => {
                    if (message.id === data.messageId) {
                        return Object.assign(Object.assign({}, message), { replyCount: data.replyCount, lastReply: data.lastReply });
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
    }, [chatId, chatType, currentUserId, session === null || session === void 0 ? void 0 : session.user, subscribeToChannel, unsubscribeFromChannel, selectedThread]);
    // Update the useEffect for unread messages
    (0, react_1.useEffect)(() => {
        if (!lastReadTimestamp || messages.length === 0)
            return;
        const unreadMessages = messages.filter(msg => msg.userId !== currentUserId &&
            isMessageAfterTimestamp(msg, lastReadTimestamp));
        if (unreadMessages.length > 0) {
            // Handle unread messages...
        }
    }, [messages, lastReadTimestamp, currentUserId]);
    const handleReactionAdd = async (messageId, emoji) => {
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
        }
        catch (error) {
            debug('Error: Failed to add reaction -', error);
        }
    };
    const handleReactionRemove = async (messageId, reactionId) => {
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
        }
        catch (error) {
            debug('Error: Failed to remove reaction -', error);
        }
    };
    return (<div className="flex h-full w-full overflow-hidden">
      <div className="flex flex-col h-full flex-1 min-w-0 bg-gray-50 dark:bg-gray-800">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SearchBar_1.default onSearch={handleSearch}/>
              </div>
              <button onClick={() => (0, react_2.signOut)()} className="ml-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Sign out">
                <lucide_react_1.LogOut className="w-5 h-5"/>
              </button>
            </div>
          </div>
        </div>

        {currentSearchQuery ? (<div className="flex-1 overflow-y-auto">
            {Object.keys(searchResults).length > 0 ? (Object.entries(searchResults).map(([groupKey, group]) => (<div key={groupKey} className="border-b dark:border-gray-700">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      {group.type === 'channel' ? `#${group.name}` : group.name}
                    </h3>
                    <div className="space-y-2">
                      {group.messages.map((message) => {
                    var _a, _b, _c;
                    return (<button key={message.id} onClick={() => handleSearchMessageClick(message)} className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <img src={((_a = message.user) === null || _a === void 0 ? void 0 : _a.image) || '/default-avatar.png'} alt={((_b = message.user) === null || _b === void 0 ? void 0 : _b.name) || 'User'} className="w-5 h-5 rounded-full"/>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {((_c = message.user) === null || _c === void 0 ? void 0 : _c.name) || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {(0, highlightText_1.highlightText)(message.content, currentSearchQuery)}
                          </div>
                        </button>);
                })}
                    </div>
                  </div>
                </div>))) : (<div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">
                  No results found for "{currentSearchQuery}"
                </div>
              </div>)}
          </div>) : (<>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
              {isLoadingInitial ? (<div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading messages...
                  </div>
                </div>) : error ? (<div className="flex items-center justify-center h-full">
                  <div className="text-red-500">{error}</div>
                </div>) : (<div>
                  {messages.map((msg, index) => {
                    const messageDate = getMessageDate(msg);
                    const lastReadTime = parseTimestamp(lastReadTimestamp);
                    const nextMessage = messages[index + 1];
                    const showUnreadLine = lastReadTimestamp &&
                        msg.userId !== currentUserId &&
                        messageDate.getTime() > lastReadTime &&
                        (!nextMessage || getMessageDate(nextMessage).getTime() <= lastReadTime);
                    return (<div key={msg.id}>
                        <MessageBubble_1.default key={msg.id} message={msg} isOwn={msg.userId === currentUserId} onThreadClick={() => handleThreadClick(msg)} chatType={chatType} chatId={chatId} searchQuery={currentSearchQuery} isHighlighted={msg.id === highlightedMessageId} onReactionAdd={handleReactionAdd} onReactionRemove={handleReactionRemove}/>
                        {showUnreadLine && (<div className="unread-messages-line border-t-2 border-red-500 my-2 relative">
                            <span className="absolute -top-3 left-4 bg-red-500 text-white px-2 py-0.5 rounded text-xs">
                              New Messages
                            </span>
                          </div>)}
                      </div>);
                })}
                  <div ref={messagesEndRef}/>
                </div>)}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
              {(typingUsers.length > 0 || isBluemanTyping) && (<div className="px-4 py-2">
                  <TypingIndicator_1.default typingUsers={isBluemanTyping ? ['Blueman AI'] : typingUsers}/>
                </div>)}
              
              <form onSubmit={sendMessage} className="p-4">
                <div className="relative">
                  <input type="text" value={message} onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
            }} placeholder={`Message ${chatName || 'the channel'}`} className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 
                             bg-white dark:bg-gray-800 
                             text-gray-900 dark:text-white
                             placeholder-gray-500 dark:placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isUploading}/>
                  <button type="button" onClick={() => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="absolute right-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" disabled={isUploading}>
                    <fi_1.FiPaperclip className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
                </div>
                {isUploading && (<div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Uploading file...
                  </div>)}
              </form>
            </div>
          </>)}
      </div>

      {selectedThread && (<div className="w-[40rem] border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
          <ThreadView_1.default parentMessage={selectedThread} onClose={handleThreadClose} chatType={chatType} chatId={chatId} currentUserId={currentUserId}/>
        </div>)}
    </div>);
}
