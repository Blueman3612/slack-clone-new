"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatusProvider = UserStatusProvider;
exports.useUserStatus = useUserStatus;
const react_1 = require("react");
const PusherContext_1 = require("./PusherContext");
const UserStatusContext = (0, react_1.createContext)(null);
function UserStatusProvider({ children }) {
    const [statuses, setStatuses] = (0, react_1.useState)({});
    const [lastFetch, setLastFetch] = (0, react_1.useState)({});
    const { subscribeToChannel, unsubscribeFromChannel } = (0, PusherContext_1.usePusher)();
    const fetchStatus = async (userId) => {
        // Check if we've fetched this status recently (within last 30 seconds)
        const now = Date.now();
        if (lastFetch[userId] && now - lastFetch[userId] < 30000) {
            return;
        }
        try {
            const response = await fetch(`/api/user/${userId}/status`);
            if (response.ok) {
                const status = await response.json();
                setStatuses(prev => (Object.assign(Object.assign({}, prev), { [userId]: status })));
                // Update last fetch time
                setLastFetch(prev => (Object.assign(Object.assign({}, prev), { [userId]: now })));
            }
            else if (response.status === 429) {
                // If rate limited, wait before allowing another fetch
                setLastFetch(prev => (Object.assign(Object.assign({}, prev), { [userId]: now + 30000 // Wait 30 seconds before trying again
                 })));
            }
        }
        catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching user status:', error.message);
            }
        }
    };
    // Subscribe to real-time status updates
    (0, react_1.useEffect)(() => {
        const handlers = {
            onNewMessage: (data) => {
                if (data.type === 'status-update') {
                    setStatuses(prev => (Object.assign(Object.assign({}, prev), { [data.userId]: data.status })));
                    // Update last fetch time since we just got fresh data
                    setLastFetch(prev => (Object.assign(Object.assign({}, prev), { [data.userId]: Date.now() })));
                }
                else if (data.type === 'status-delete') {
                    setStatuses(prev => {
                        const newStatuses = Object.assign({}, prev);
                        delete newStatuses[data.userId];
                        return newStatuses;
                    });
                }
            }
        };
        // Subscribe to the global presence channel for status updates
        subscribeToChannel('presence-user-status', handlers);
        return () => {
            unsubscribeFromChannel('presence-user-status');
        };
    }, [subscribeToChannel, unsubscribeFromChannel]);
    return (<UserStatusContext.Provider value={{
            statuses,
            fetchStatus,
        }}>
      {children}
    </UserStatusContext.Provider>);
}
function useUserStatus() {
    const context = (0, react_1.useContext)(UserStatusContext);
    if (!context) {
        throw new Error('useUserStatus must be used within a UserStatusProvider');
    }
    return context;
}
