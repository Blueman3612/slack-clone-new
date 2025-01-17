"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PusherContext = void 0;
exports.PusherProvider = PusherProvider;
exports.usePusher = usePusher;
const react_1 = require("react");
const pusher_1 = require("@/lib/pusher");
const react_2 = require("next-auth/react");
const debug = (...args) => {
    if (process.env.NODE_ENV === 'development') {
        const message = args[0];
        const isCritical = message.includes('Error:') ||
            message.includes('error subscribing') ||
            message.includes('cleanup') ||
            message.includes('unsubscribing');
        if (isCritical) {
            console.debug('[PusherContext]', ...args);
        }
    }
};
exports.PusherContext = (0, react_1.createContext)(null);
function PusherProvider({ children }) {
    const { data: session } = (0, react_2.useSession)();
    const subscriptionsRef = (0, react_1.useRef)(new Map());
    const unsubscribeFromChannel = (0, react_1.useCallback)((channelName) => {
        debug(`Unsubscribing from channel: ${channelName}`);
        if (!pusher_1.isClient || !pusher_1.pusherClient)
            return;
        try {
            const channel = subscriptionsRef.current.get(channelName);
            if (channel) {
                channel.unbind_all();
                pusher_1.pusherClient.unsubscribe(channelName);
                subscriptionsRef.current.delete(channelName);
                debug(`Successfully unsubscribed from ${channelName}`);
            }
        }
        catch (error) {
            console.error(`Error in unsubscribeFromChannel for ${channelName}:`, error);
        }
    }, []);
    const subscribeToChannel = (0, react_1.useCallback)((channelName, handlers) => {
        if (!pusher_1.pusherClient) {
            console.error('Pusher client is not available');
            return;
        }
        // Clean up any existing subscription
        unsubscribeFromChannel(channelName);
        // Subscribe to the channel
        const channel = pusher_1.pusherClient.subscribe(channelName);
        // Bind to events
        if (handlers.onNewMessage) {
            channel.bind('new-message', handlers.onNewMessage);
        }
        if (handlers.onTyping) {
            channel.bind('client-typing', handlers.onTyping);
        }
        if (handlers.onStopTyping) {
            channel.bind('client-stop-typing', handlers.onStopTyping);
        }
        if (handlers.onReaction) {
            channel.bind('reaction-added', (data) => {
                var _a;
                (_a = handlers.onReaction) === null || _a === void 0 ? void 0 : _a.call(handlers, {
                    messageId: data.messageId,
                    reaction: data.reaction,
                    type: 'add'
                });
            });
            channel.bind('reaction-removed', (data) => {
                var _a;
                (_a = handlers.onReaction) === null || _a === void 0 ? void 0 : _a.call(handlers, {
                    messageId: data.messageId,
                    reaction: data.reaction,
                    type: 'remove'
                });
            });
        }
        if (handlers.onThreadUpdate) {
            channel.bind('thread-update', handlers.onThreadUpdate);
        }
        // Store the subscription
        subscriptionsRef.current.set(channelName, channel);
    }, [unsubscribeFromChannel]);
    const subscribeToPresenceChannel = (0, react_1.useCallback)((channelName, handlers) => {
        if (!pusher_1.isClient || !pusher_1.pusherClient)
            return;
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            debug(`Skipping presence channel subscription to ${channelName}: No authenticated user`);
            return;
        }
        debug(`Subscribing to presence channel: ${channelName}`);
        try {
            // Check for existing subscription in Pusher
            const existingPusherChannel = pusher_1.pusherClient.channel(channelName);
            if (existingPusherChannel) {
                debug(`Found existing Pusher subscription to ${channelName}, unsubscribing`);
                existingPusherChannel.unbind_all();
                pusher_1.pusherClient.unsubscribe(channelName);
            }
            // Check our local subscriptions
            if (subscriptionsRef.current.has(channelName)) {
                debug(`Found existing local subscription to ${channelName}, cleaning up`);
                unsubscribeFromChannel(channelName);
            }
            const channel = pusher_1.pusherClient.subscribe(channelName);
            subscriptionsRef.current.set(channelName, channel);
            if (handlers.onSubscriptionSucceeded) {
                channel.bind('pusher:subscription_succeeded', handlers.onSubscriptionSucceeded);
            }
            if (handlers.onMemberAdded) {
                channel.bind('pusher:member_added', handlers.onMemberAdded);
            }
            if (handlers.onMemberRemoved) {
                channel.bind('pusher:member_removed', handlers.onMemberRemoved);
            }
            channel.bind('pusher:subscription_error', (error) => {
                debug(`Error subscribing to presence channel ${channelName}:`, error);
            });
        }
        catch (error) {
            console.error(`Error in subscribeToPresenceChannel for ${channelName}:`, error);
        }
    }, [unsubscribeFromChannel, session]);
    // Clean up all subscriptions when the provider unmounts
    (0, react_1.useEffect)(() => {
        return () => {
            if (pusher_1.isClient && pusher_1.pusherClient) {
                subscriptionsRef.current.forEach((_, channelName) => {
                    unsubscribeFromChannel(channelName);
                });
            }
        };
    }, [unsubscribeFromChannel]);
    const value = (0, react_1.useMemo)(() => ({
        subscribeToChannel,
        unsubscribeFromChannel,
        subscribeToPresenceChannel
    }), [subscribeToChannel, unsubscribeFromChannel, subscribeToPresenceChannel]);
    return (<exports.PusherContext.Provider value={value}>
      {children}
    </exports.PusherContext.Provider>);
}
function usePusher() {
    const context = (0, react_1.useContext)(exports.PusherContext);
    if (!context) {
        throw new Error('usePusher must be used within a PusherProvider');
    }
    return context;
}
