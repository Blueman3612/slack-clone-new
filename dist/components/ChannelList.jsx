"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChannelList;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const PusherContext_1 = require("@/contexts/PusherContext");
function ChannelList({ currentUser }) {
    const [channels, setChannels] = (0, react_1.useState)([]);
    const [isCreating, setIsCreating] = (0, react_1.useState)(false);
    const [newChannelName, setNewChannelName] = (0, react_1.useState)('');
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const currentChannelId = searchParams.get('channelId');
    const { subscribeToChannel, unsubscribeFromChannel } = (0, PusherContext_1.usePusher)();
    (0, react_1.useEffect)(() => {
        fetchChannels();
        // Subscribe to channel updates using PusherContext
        subscribeToChannel('channel-updates', {
            onNewMessage: (newChannel) => {
                setChannels(prev => {
                    if (prev.some(ch => ch.id === newChannel.id))
                        return prev;
                    return [...prev, newChannel];
                });
            },
            onThreadUpdate: (updatedChannel) => {
                setChannels(prev => prev.map(ch => ch.id === updatedChannel.id ? updatedChannel : ch));
            },
            onReaction: (data) => {
                setChannels(prev => prev.filter(ch => ch.id !== data.channelId));
                if (currentChannelId === data.channelId) {
                    router.push('/chat');
                }
            }
        });
        return () => {
            unsubscribeFromChannel('channel-updates');
        };
    }, [currentChannelId, router, subscribeToChannel, unsubscribeFromChannel]);
    const fetchChannels = async () => {
        try {
            const response = await fetch('/api/channels');
            if (!response.ok) {
                throw new Error('Failed to fetch channels');
            }
            const data = await response.json();
            setChannels(data);
            // Only redirect to general if no channel OR user is selected
            if (!currentChannelId && !searchParams.get('userId') && data.length > 0) {
                const generalChannel = data.find((channel) => channel.name === 'general');
                if (generalChannel) {
                    router.push(`/chat?channelId=${generalChannel.id}`);
                }
            }
        }
        catch (error) {
            console.error('Error fetching channels:', error);
        }
    };
    const handleChannelClick = (channelId) => {
        router.push(`/chat?channelId=${channelId}`);
    };
    const handleCreateChannel = async (e) => {
        e.preventDefault();
        if (!newChannelName.trim())
            return;
        try {
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
                throw new Error('Failed to create channel');
            }
            const newChannel = await response.json();
            setNewChannelName('');
            setIsCreating(false);
            router.push(`/chat?channelId=${newChannel.id}`);
        }
        catch (error) {
            console.error('Error creating channel:', error);
        }
    };
    return (<div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Channels</h2>
        <button onClick={() => setIsCreating(true)} className="text-gray-400 hover:text-white">
          <lucide_react_1.Plus size={20}/>
        </button>
      </div>

      {isCreating && (<form onSubmit={handleCreateChannel} className="mb-4">
          <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="New channel name" className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus/>
        </form>)}

      <ul>
        {channels.map((channel) => (<li key={channel.id} onClick={() => handleChannelClick(channel.id)} className={`
              flex items-center gap-2 p-2 rounded cursor-pointer
              ${currentChannelId === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'}
            `}>
            <span className="text-gray-300">#</span>
            <span className="text-white">{channel.name}</span>
          </li>))}
      </ul>
    </div>);
}
