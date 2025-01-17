"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ThreadView;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const MessageBubble_1 = __importDefault(require("./MessageBubble"));
const lucide_react_1 = require("lucide-react");
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
const PusherContext_1 = require("@/contexts/PusherContext");
const TypingIndicator_1 = __importDefault(require("./TypingIndicator"));
const axios_1 = __importDefault(require("axios"));
function ThreadView({ parentMessage: initialParentMessage, onClose, chatType, chatId, currentUserId }) {
    const { data: session } = (0, react_2.useSession)();
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [parentMessage, setParentMessage] = (0, react_1.useState)(initialParentMessage);
    const [newMessage, setNewMessage] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [typingUsers, setTypingUsers] = (0, react_1.useState)([]);
    const messagesEndRef = (0, react_1.useRef)(null);
    const { onlineUsers } = (0, OnlineUsersContext_1.useOnlineUsers)();
    const typingTimeoutRef = (0, react_1.useRef)();
    const { subscribeToChannel, unsubscribeFromChannel } = (0, PusherContext_1.usePusher)();
    // Handle typing events
    const handleTyping = async () => {
        if (!(session === null || session === void 0 ? void 0 : session.user))
            return;
        const channelName = `presence-thread-${parentMessage.id}`;
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        try {
            // Send typing event
            await axios_1.default.post('/api/pusher/trigger-event', {
                channel: channelName,
                event: 'client-typing',
                data: {
                    userId: currentUserId,
                    name: session.user.name || 'Anonymous'
                }
            });
            // Set timeout to stop typing
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
    // Subscribe to thread updates and typing events
    (0, react_1.useEffect)(() => {
        const channelName = `presence-thread-${parentMessage.id}`;
        const handlers = {
            onNewMessage: (reply) => {
                if (reply.type === 'message-delete') {
                    setMessages(current => current.filter(msg => msg.id !== reply.messageId));
                    setParentMessage(prev => (Object.assign(Object.assign({}, prev), { replyCount: Math.max(0, (prev.replyCount || 0) - 1) })));
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
            onTyping: (data) => {
                if (data.userId !== currentUserId) {
                    setTypingUsers((users) => {
                        if (!users.includes(data.name)) {
                            return [...users, data.name];
                        }
                        return users;
                    });
                }
            },
            onStopTyping: (data) => {
                if (data.userId !== currentUserId) {
                    setTypingUsers((users) => users.filter(name => name !== data.name));
                }
            },
            onThreadUpdate: (data) => {
                setParentMessage(prev => (Object.assign(Object.assign({}, prev), { replyCount: data.replyCount })));
            },
            onReaction: (data) => {
                const updateReactions = (message) => {
                    if (message.id !== data.messageId)
                        return message;
                    const currentReactions = message.reactions || [];
                    if (data.type === 'add') {
                        // Only add if not already present
                        if (!currentReactions.some(r => r.id === data.reaction.id)) {
                            return Object.assign(Object.assign({}, message), { reactions: [...currentReactions, data.reaction] });
                        }
                    }
                    else {
                        // Remove reaction
                        return Object.assign(Object.assign({}, message), { reactions: currentReactions.filter(r => {
                                if (data.reaction.id) {
                                    return r.id !== data.reaction.id;
                                }
                                return !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId);
                            }) });
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
    (0, react_1.useEffect)(() => {
        const fetchReplies = async () => {
            try {
                const response = await fetch(`/api/messages/thread/${parentMessage.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            }
            catch (error) {
                console.error('Error fetching replies:', error);
            }
        };
        fetchReplies();
    }, [parentMessage.id]);
    // Auto scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
    };
    (0, react_1.useEffect)(() => {
        scrollToBottom();
    }, [messages]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim())
            return;
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
        }
        catch (error) {
            console.error('Error sending reply:', error);
            setNewMessage(messageContent);
        }
    };
    // Add instant scroll to bottom when thread loads
    (0, react_1.useEffect)(() => {
        var _a;
        if (!isLoading && messages.length > 0) {
            (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'instant' });
        }
    }, [isLoading, messages.length]);
    return (<div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Thread header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <lucide_react_1.X className="h-5 w-5"/>
        </button>
      </div>

      {/* Parent message */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <MessageBubble_1.default message={parentMessage} isOwn={parentMessage.userId === currentUserId} showThread={false} chatType={chatType} chatId={chatId}/>
      </div>

      {/* Thread messages */}
      <div className="flex-1 overflow-y-auto p-4" key="thread-messages">
        {messages.map((message) => (<MessageBubble_1.default key={message.id} message={message} isOwn={message.userId === currentUserId} showThread={false} chatType={chatType} chatId={chatId}/>))}
        <div ref={messagesEndRef}/>
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (<div className="px-4 py-2">
          <TypingIndicator_1.default typingUsers={typingUsers}/>
        </div>)}

      {/* Message input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <input type="text" value={newMessage} onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
        }} placeholder="Reply in thread..." className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 
                   bg-white dark:bg-gray-800 
                   text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </form>
    </div>);
}
