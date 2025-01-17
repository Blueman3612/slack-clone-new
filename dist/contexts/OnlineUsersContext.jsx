"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOnlineUsers = void 0;
exports.OnlineUsersProvider = OnlineUsersProvider;
const react_1 = require("react");
const PusherContext_1 = require("./PusherContext");
const OnlineUsersContext = (0, react_1.createContext)({ onlineUsers: new Set() });
function OnlineUsersProvider({ children }) {
    const [onlineUsers, setOnlineUsers] = (0, react_1.useState)(new Set());
    const { subscribeToPresenceChannel, unsubscribeFromChannel } = (0, PusherContext_1.usePusher)();
    (0, react_1.useEffect)(() => {
        // Subscribe to global presence channel
        subscribeToPresenceChannel('presence-global', {
            onSubscriptionSucceeded: (members) => {
                const onlineUserIds = new Set();
                members.each((member) => {
                    onlineUserIds.add(member.id);
                });
                setOnlineUsers(onlineUserIds);
            },
            onMemberAdded: (member) => {
                setOnlineUsers((prev) => new Set(Array.from(prev).concat(member.id)));
            },
            onMemberRemoved: (member) => {
                setOnlineUsers((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(member.id);
                    return newSet;
                });
            }
        });
        return () => {
            unsubscribeFromChannel('presence-global');
        };
    }, [subscribeToPresenceChannel, unsubscribeFromChannel]);
    return (<OnlineUsersContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineUsersContext.Provider>);
}
const useOnlineUsers = () => (0, react_1.useContext)(OnlineUsersContext);
exports.useOnlineUsers = useOnlineUsers;
