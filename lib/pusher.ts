import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

// Helper function to check if we're on the client side
export const isClient = typeof window !== 'undefined';

// Debug function for critical events only
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    const message = args[0];
    const isCritical = 
      message.includes('Error:') || 
      message.includes('error:') ||
      message.includes('limit reached');
      
    if (isCritical) {
      console.debug('[Pusher]', ...args);
    }
  }
};

// Client-side Pusher instance
export const pusherClient = isClient
  ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
      activityTimeout: 60000,
      pongTimeout: 30000
    })
  : null;

// Only set up event handlers on the client side
if (isClient && pusherClient) {
  pusherClient.connection.bind('error', (error: any) => {
    if (error?.error?.data?.code === 4004) {
      debug('Error: Subscription limit reached, cleaning up...');
      if (pusherClient?.channels) {
        Object.keys(pusherClient.channels.channels).forEach(channelName => {
          pusherClient.unsubscribe(channelName);
        });
      }
      // Try to reconnect after cleanup
      setTimeout(() => {
        pusherClient?.connect();
      }, 1000);
    } else {
      debug('Error: Connection failed -', error?.error || error);
    }
  });

  // Automatically disconnect when the page is unloaded
  window.addEventListener('beforeunload', () => {
    if (pusherClient?.connection.state === 'connected') {
      pusherClient.disconnect();
    }
  });

  // Handle visibility change to reconnect when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 
        pusherClient?.connection.state !== 'connected') {
      pusherClient?.connect();
    }
  });
}