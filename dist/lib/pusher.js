"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pusherClient = exports.isClient = exports.pusherServer = void 0;
const pusher_1 = __importDefault(require("pusher"));
const pusher_js_1 = __importDefault(require("pusher-js"));
exports.pusherServer = new pusher_1.default({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true
});
// Helper function to check if we're on the client side
exports.isClient = typeof window !== 'undefined';
// Debug function for critical events only
const debug = (...args) => {
    if (process.env.NODE_ENV === 'development') {
        const message = args[0];
        const isCritical = message.includes('Error:') ||
            message.includes('error:') ||
            message.includes('limit reached');
        if (isCritical) {
            console.debug('[Pusher]', ...args);
        }
    }
};
// Client-side Pusher instance
exports.pusherClient = exports.isClient
    ? new pusher_js_1.default(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        authEndpoint: '/api/pusher/auth',
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
        activityTimeout: 60000,
        pongTimeout: 30000
    })
    : null;
// Only set up event handlers on the client side
if (exports.isClient && exports.pusherClient) {
    exports.pusherClient.connection.bind('error', (error) => {
        var _a, _b;
        if (((_b = (_a = error === null || error === void 0 ? void 0 : error.error) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.code) === 4004) {
            debug('Error: Subscription limit reached, cleaning up...');
            if (exports.pusherClient === null || exports.pusherClient === void 0 ? void 0 : exports.pusherClient.channels) {
                Object.keys(exports.pusherClient.channels.channels).forEach(channelName => {
                    exports.pusherClient.unsubscribe(channelName);
                });
            }
            // Try to reconnect after cleanup
            setTimeout(() => {
                exports.pusherClient === null || exports.pusherClient === void 0 ? void 0 : exports.pusherClient.connect();
            }, 1000);
        }
        else {
            debug('Error: Connection failed -', (error === null || error === void 0 ? void 0 : error.error) || error);
        }
    });
    // Automatically disconnect when the page is unloaded
    window.addEventListener('beforeunload', () => {
        if ((exports.pusherClient === null || exports.pusherClient === void 0 ? void 0 : exports.pusherClient.connection.state) === 'connected') {
            exports.pusherClient.disconnect();
        }
    });
    // Handle visibility change to reconnect when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' &&
            (exports.pusherClient === null || exports.pusherClient === void 0 ? void 0 : exports.pusherClient.connection.state) !== 'connected') {
            exports.pusherClient === null || exports.pusherClient === void 0 ? void 0 : exports.pusherClient.connect();
        }
    });
}
