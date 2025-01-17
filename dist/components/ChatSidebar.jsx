"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatSidebar;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const react_2 = require("next-auth/react");
const image_1 = __importDefault(require("next/image"));
const UserList_1 = __importDefault(require("./UserList"));
const UserStatus_1 = __importDefault(require("./UserStatus"));
const lucide_react_1 = require("lucide-react");
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
const useRole_1 = require("@/hooks/useRole");
const utils_1 = require("@/lib/utils");
const PusherContext_1 = require("@/contexts/PusherContext");
function ChatSidebar() {
    var _a, _b, _c, _d, _e, _f;
    const { data: session, status } = (0, react_2.useSession)();
    const { isAdmin } = (0, useRole_1.useRole)();
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [channels, setChannels] = (0, react_1.useState)([]);
    const [users, setUsers] = (0, react_1.useState)([]);
    const currentChannelId = searchParams.get('channelId');
    const currentUserId = searchParams.get('userId');
    const [isCreating, setIsCreating] = (0, react_1.useState)(false);
    const [newChannelName, setNewChannelName] = (0, react_1.useState)('');
    const { onlineUsers } = (0, OnlineUsersContext_1.useOnlineUsers)();
    const [notifications, setNotifications] = (0, react_1.useState)({});
    const [bluemanUser, setBluemanUser] = (0, react_1.useState)(null);
    const { subscribeToChannel, unsubscribeFromChannel } = (0, PusherContext_1.usePusher)();
    console.log('Admin status:', {
        isAdmin,
        userRole: (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.role,
        userId: (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.id
    });
    (0, react_1.useEffect)(() => {
        const fetchUsers = async () => {
            const user = session === null || session === void 0 ? void 0 : session.user;
            if (!(user === null || user === void 0 ? void 0 : user.id))
                return;
            try {
                const response = await fetch('/api/users', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const blueman = data.find((user) => user.email === 'blueman@ai.local');
                if (blueman) {
                    setBluemanUser(blueman);
                    const filteredUsers = data.filter((u) => u.id !== user.id && u.email !== 'blueman@ai.local');
                    setUsers(filteredUsers);
                }
                else {
                    const filteredUsers = data.filter((u) => u.id !== user.id);
                    setUsers(filteredUsers);
                }
            }
            catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, [(_c = session === null || session === void 0 ? void 0 : session.user) === null || _c === void 0 ? void 0 : _c.id]);
    (0, react_1.useEffect)(() => {
        const fetchChannels = async () => {
            const user = session === null || session === void 0 ? void 0 : session.user;
            if (!(user === null || user === void 0 ? void 0 : user.id))
                return;
            try {
                const response = await fetch('/api/channels');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setChannels(data);
            }
            catch (error) {
                console.error('Error fetching channels:', error);
            }
        };
        fetchChannels();
    }, [(_d = session === null || session === void 0 ? void 0 : session.user) === null || _d === void 0 ? void 0 : _d.id]);
    const handleCreateChannel = async (e) => {
        e.preventDefault();
        if (!newChannelName.trim())
            return;
        try {
            console.log('Attempting to create channel:', newChannelName);
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
                }),
            });
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Channel creation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                throw new Error(`Failed to create channel: ${errorData}`);
            }
            const newChannel = await response.json();
            console.log('Channel created successfully:', newChannel);
            setChannels(prev => [...prev, newChannel]);
            setNewChannelName('');
            setIsCreating(false);
            router.push(`/chat?channelId=${newChannel.id}`);
        }
        catch (error) {
            console.error('Error in handleCreateChannel:', error);
            throw error;
        }
    };
    const handleNewMessage = (message) => {
        const user = session === null || session === void 0 ? void 0 : session.user;
        if (!(user === null || user === void 0 ? void 0 : user.id))
            return;
        console.log('Received message:', message);
        setNotifications(prev => {
            if (message.userId === user.id)
                return prev;
            let key;
            let shouldNotify = true;
            if (message.receiverId) {
                const isDMForCurrentUser = message.receiverId === user.id;
                if (!isDMForCurrentUser)
                    return prev;
                key = `dm-${message.userId}`;
                shouldNotify = currentUserId !== message.userId;
            }
            else if (message.channelId) {
                key = message.channelId;
                shouldNotify = currentChannelId !== message.channelId;
            }
            else {
                return prev;
            }
            if (!shouldNotify)
                return prev;
            console.log('Updating notifications:', {
                key,
                shouldNotify,
                currentUserId,
                messageUserId: message.userId,
                messageReceiverId: message.receiverId
            });
            const currentNotification = prev[key] || { count: 0, hasUnread: false, hasMention: false };
            const hasMention = message.content.includes(`@${user.name}`) ||
                message.content.includes('@everyone');
            return Object.assign(Object.assign({}, prev), { [key]: {
                    count: currentNotification.count + 1,
                    hasUnread: true,
                    hasMention: hasMention || currentNotification.hasMention
                } });
        });
    };
    (0, react_1.useEffect)(() => {
        const user = session === null || session === void 0 ? void 0 : session.user;
        if (!(user === null || user === void 0 ? void 0 : user.id))
            return;
        // Subscribe to all channel messages
        channels.forEach(channel => {
            const channelName = `channel-${channel.id}`;
            subscribeToChannel(channelName, {
                onNewMessage: handleNewMessage
            });
        });
        // Subscribe to direct messages
        const dmChannel = `dm-${user.id}`;
        subscribeToChannel(dmChannel, {
            onNewMessage: handleNewMessage
        });
        return () => {
            // Cleanup subscriptions
            unsubscribeFromChannel(`dm-${user.id}`);
            channels.forEach(channel => {
                unsubscribeFromChannel(`channel-${channel.id}`);
            });
        };
    }, [(_e = session === null || session === void 0 ? void 0 : session.user) === null || _e === void 0 ? void 0 : _e.id, channels, subscribeToChannel, unsubscribeFromChannel]);
    (0, react_1.useEffect)(() => {
        if (currentChannelId) {
            setNotifications(prev => (Object.assign(Object.assign({}, prev), { [currentChannelId]: { count: 0, hasUnread: false, hasMention: false } })));
        }
        else if (currentUserId) {
            setNotifications(prev => (Object.assign(Object.assign({}, prev), { [`dm-${currentUserId}`]: { count: 0, hasUnread: false, hasMention: false } })));
        }
    }, [currentChannelId, currentUserId]);
    if (status === 'loading') {
        return <div className="w-64 bg-gray-900 text-white p-4">Loading...</div>;
    }
    if (!(session === null || session === void 0 ? void 0 : session.user)) {
        return null;
    }
    return (<div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative w-16 h-16">
            <image_1.default src="/Acksle Logo.png" alt="Acksle Logo" fill className="object-contain [image-rendering:pixelated]" priority/>
          </div>
          <h1 className="text-4xl font-light tracking-wider leading-none" style={{ transform: 'scaleY(2)' }}>
            ACKSLE
          </h1>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Channels</h2>
            {/* Debug: isAdmin={isAdmin?.toString()} */}
            {isAdmin && (<button onClick={() => setIsCreating(true)} className="text-gray-400 hover:text-white" title="Create Channel">
                <lucide_react_1.Plus size={20}/>
              </button>)}
          </div>

          {isCreating && isAdmin && (<form onSubmit={handleCreateChannel} className="mb-4">
              <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="New channel name" className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus/>
            </form>)}

          <ul className="space-y-1">
            {channels.map(channel => {
            const notification = notifications[channel.id];
            return (<li key={channel.id} className={(0, utils_1.cn)("flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200", currentChannelId === channel.id
                    ? "bg-blue-600/30 border-l-4 border-blue-500"
                    : "hover:bg-gray-700 border-l-4 border-transparent")} onClick={() => router.push(`/chat?channelId=${channel.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className={(0, utils_1.cn)("text-sm transition-colors duration-200", currentChannelId === channel.id ? "text-blue-400" : "text-gray-300")}>#</span>
                    <span className={(0, utils_1.cn)("text-sm transition-colors duration-200", (notification === null || notification === void 0 ? void 0 : notification.hasUnread) ? "font-bold" : "font-normal", currentChannelId === channel.id ? "text-blue-400" : "text-white")}>
                      {channel.name}
                    </span>
                  </div>
                  {(notification === null || notification === void 0 ? void 0 : notification.count) > 0 && (<span className={(0, utils_1.cn)("px-2 py-0.5 text-xs rounded-full", notification.hasMention ? "bg-red-500" : "bg-gray-600")}>
                      {notification.count}
                    </span>)}
                </li>);
        })}
          </ul>
        </div>

        <UserList_1.default initialUsers={bluemanUser ? [bluemanUser, ...users] : users} currentUserId={((_f = session === null || session === void 0 ? void 0 : session.user) === null || _f === void 0 ? void 0 : _f.id) || ''} onUserClick={(userId) => router.push(`/chat?userId=${userId}`)} selectedUserId={currentUserId} onlineUsers={onlineUsers} notifications={notifications}/>
      </div>

      <UserStatus_1.default />
    </div>);
}
