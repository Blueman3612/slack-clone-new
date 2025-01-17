"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MessageBubble;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const react_2 = require("next-auth/react");
const EmojiPicker_1 = __importDefault(require("./EmojiPicker"));
const lucide_react_1 = require("lucide-react");
const image_1 = __importDefault(require("next/image"));
const StatusTooltip_1 = __importDefault(require("./StatusTooltip"));
const UserStatusContext_1 = require("@/contexts/UserStatusContext");
const useRole_1 = require("@/hooks/useRole");
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
const debug = (...args) => {
    if (process.env.NODE_ENV === 'development') {
        const message = args[0];
        const isCritical = message.includes('Error:') ||
            message.includes('failed');
        if (isCritical) {
            console.debug('[MessageBubble]', ...args);
        }
    }
};
function MessageBubble({ message: initialMessage, isOwn, onThreadClick, showThread = true, chatType, chatId, searchQuery = '', onMessageClick, isSearchResult = false, isHighlighted = false, onReactionAdd, onReactionRemove }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { data: session } = (0, react_2.useSession)();
    const { isAdmin } = (0, useRole_1.useRole)();
    const [showEmojiPicker, setShowEmojiPicker] = (0, react_1.useState)(false);
    const emojiButtonRef = (0, react_1.useRef)(null);
    const [showUserStatus, setShowUserStatus] = (0, react_1.useState)(false);
    const avatarRef = (0, react_1.useRef)(null);
    const { statuses, fetchStatus } = (0, UserStatusContext_1.useUserStatus)();
    const { onlineUsers } = (0, OnlineUsersContext_1.useOnlineUsers)();
    const effectiveChatId = chatType === 'channel'
        ? initialMessage.channelId
        : initialMessage.receiverId
            ? [initialMessage.userId, initialMessage.receiverId].sort().join('-')
            : chatId;
    (0, react_1.useEffect)(() => {
        function handleClickOutside(event) {
            if (showEmojiPicker &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target)) {
                const picker = document.querySelector('[data-emoji-picker]');
                if (!(picker === null || picker === void 0 ? void 0 : picker.contains(event.target))) {
                    setShowEmojiPicker(false);
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);
    const userName = ((_a = initialMessage.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User';
    const userImage = ((_b = initialMessage.user) === null || _b === void 0 ? void 0 : _b.image) || '/default-avatar.png';
    const isOnline = onlineUsers === null || onlineUsers === void 0 ? void 0 : onlineUsers.has(initialMessage.userId);
    // Group reactions by emoji
    const groupedReactions = ((_c = initialMessage.reactions) === null || _c === void 0 ? void 0 : _c.reduce((acc, reaction) => {
        var _a, _b;
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = {
                users: [],
                count: 0,
                hasReacted: false
            };
        }
        if ((_a = reaction.user) === null || _a === void 0 ? void 0 : _a.name) {
            acc[reaction.emoji].users.push(reaction.user.name);
        }
        acc[reaction.emoji].count++;
        if (reaction.userId === ((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.id)) {
            acc[reaction.emoji].hasReacted = true;
        }
        return acc;
    }, {})) || {};
    const handleReaction = (emoji) => {
        var _a;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        onReactionAdd === null || onReactionAdd === void 0 ? void 0 : onReactionAdd(initialMessage.id, emoji);
        setShowEmojiPicker(false);
    };
    const handleReactionClick = (reaction) => {
        var _a, _b, _c;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        // If the user has already reacted with this emoji, remove their reaction
        const userHasReacted = (_b = initialMessage.reactions) === null || _b === void 0 ? void 0 : _b.some(r => r.emoji === reaction.emoji && r.userId === session.user.id);
        if (userHasReacted) {
            // Find the user's reaction to remove
            const userReaction = (_c = initialMessage.reactions) === null || _c === void 0 ? void 0 : _c.find(r => r.emoji === reaction.emoji && r.userId === session.user.id);
            if (userReaction) {
                onReactionRemove === null || onReactionRemove === void 0 ? void 0 : onReactionRemove(initialMessage.id, userReaction.id);
            }
        }
        else {
            // Add the same reaction
            handleReaction(reaction.emoji);
        }
    };
    const renderContent = () => {
        var _a;
        if (initialMessage.fileUrl) {
            return (<div className="mt-1">
          {((_a = initialMessage.fileType) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) ? (<image_1.default src={initialMessage.fileUrl} alt={initialMessage.fileName || 'Uploaded image'} width={200} height={200} className="rounded-md"/>) : (<a href={initialMessage.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              {initialMessage.fileName || 'Download file'}
            </a>)}
        </div>);
        }
        const highlightedContent = searchQuery
            ? initialMessage.content.replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark class="bg-yellow-300 text-black">$1</mark>')
            : initialMessage.content;
        return (<div className="whitespace-pre-wrap break-words">
        {searchQuery ? (<div dangerouslySetInnerHTML={{ __html: highlightedContent }}/>) : (initialMessage.content)}
      </div>);
    };
    // Add status fetching effect
    (0, react_1.useEffect)(() => {
        var _a;
        if (showUserStatus && ((_a = initialMessage.user) === null || _a === void 0 ? void 0 : _a.id) && !statuses[initialMessage.user.id]) {
            fetchStatus(initialMessage.user.id);
        }
    }, [showUserStatus, (_d = initialMessage.user) === null || _d === void 0 ? void 0 : _d.id, fetchStatus, statuses]);
    const handleDelete = async () => {
        var _a;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        try {
            const response = await fetch(`/api/messages/${initialMessage.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete message');
            }
            debug('Message deleted successfully');
        }
        catch (error) {
            debug('Error deleting message:', error);
        }
    };
    // Determine if delete button should be shown
    const showDeleteButton = isOwn || (isAdmin && chatType === 'channel');
    return (<div className={`flex items-start space-x-3 group px-4 py-2 
        ${isSearchResult ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.02]'} 
        transition-colors duration-100 ${isHighlighted ? 'animate-highlight bg-yellow-100 dark:bg-yellow-900' : ''}`} onClick={isSearchResult ? onMessageClick : undefined} id={`message-${initialMessage.id}`}>
      <div ref={avatarRef} className="relative flex-shrink-0" onMouseEnter={() => setShowUserStatus(true)} onMouseLeave={() => setShowUserStatus(false)}>
        <image_1.default src={userImage} alt={userName} width={36} height={36} className="rounded-md"/>
        {isOnline && (<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>)}
        {showUserStatus && ((_e = initialMessage.user) === null || _e === void 0 ? void 0 : _e.id) && statuses[initialMessage.user.id] && avatarRef.current && (<StatusTooltip_1.default emoji={(_f = statuses[initialMessage.user.id]) === null || _f === void 0 ? void 0 : _f.emoji} text={(_g = statuses[initialMessage.user.id]) === null || _g === void 0 ? void 0 : _g.text} targetRef={avatarRef.current}/>)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">{userName}</span>
          {((_h = initialMessage.user) === null || _h === void 0 ? void 0 : _h.role) === 'ADMIN' && (<lucide_react_1.Shield className="w-4 h-4 text-blue-400" aria-label="Admin"/>)}
          {((_j = initialMessage.user) === null || _j === void 0 ? void 0 : _j.role) === 'AI' && (<lucide_react_1.Bot className="w-4 h-4 text-purple-400" aria-label="AI Bot"/>)}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(() => {
            try {
                const date = new Date(initialMessage.createdAt);
                if (isNaN(date.getTime())) {
                    return 'Invalid date';
                }
                return (0, date_fns_1.isToday)(date)
                    ? (0, date_fns_1.format)(date, 'h:mm a')
                    : (0, date_fns_1.format)(date, 'MMMM d, h:mm a');
            }
            catch (error) {
                return 'Invalid date';
            }
        })()}
          </span>
        </div>

        {renderContent()}

        {initialMessage.reactions && initialMessage.reactions.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions || {}).map(([emoji, { users, count, hasReacted }]) => {
                var _a;
                const userReaction = (_a = initialMessage.reactions) === null || _a === void 0 ? void 0 : _a.find(r => { var _a; return r.emoji === emoji && r.userId === ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id); });
                return (<button key={emoji} onClick={() => {
                        var _a;
                        return handleReactionClick(userReaction || ((_a = initialMessage.reactions) === null || _a === void 0 ? void 0 : _a.find(r => r.emoji === emoji)));
                    }} className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                    bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                    ${hasReacted ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`} title={users.join(', ')}>
                  <span>{emoji}</span>
                  {count > 1 && (<span className="ml-1 text-gray-600 dark:text-gray-300">
                      {count}
                    </span>)}
                </button>);
            })}
          </div>)}

        {showThread && ((_k = initialMessage.replyCount) !== null && _k !== void 0 ? _k : 0) > 0 && (<div className="mt-1">
            <button onClick={onThreadClick} className="text-xs inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 
                       dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              <lucide_react_1.MessageSquare className="w-3.5 h-3.5"/>
              <span>{initialMessage.replyCount} {initialMessage.replyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
          </div>)}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
        <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          😀
        </button>
        
        {showThread && (<button onClick={onThreadClick} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="Reply in thread">
            <lucide_react_1.MessageSquare className="w-4 h-4"/>
          </button>)}

        {showDeleteButton && (<button onClick={handleDelete} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-red-600 dark:hover:text-red-400" title={isAdmin && !isOwn ? "Delete message (Admin)" : "Delete message"}>
            <lucide_react_1.Trash2 className="w-4 h-4"/>
          </button>)}
      </div>

      {showEmojiPicker && (<div className="fixed z-50">
          <EmojiPicker_1.default onEmojiSelect={handleReaction} position="top" targetRef={emojiButtonRef}/>
        </div>)}
    </div>);
}
