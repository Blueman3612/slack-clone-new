import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

console.log('Environment:', {
  isClient: typeof window !== 'undefined',
  hasAppId: !!process.env.PUSHER_APP_ID,
  hasKey: !!process.env.NEXT_PUBLIC_PUSHER_KEY,
  hasSecret: !!process.env.PUSHER_SECRET,
  hasCluster: !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER
});

// Server-side Pusher instance
export const pusherServer = typeof window === 'undefined' 
  ? new PusherServer({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      useTLS: true,
    })
  : null;

// Client-side Pusher instance
export const pusherClient = typeof window !== 'undefined'
  ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
    })
  : null;

// Helper function to check if we're on the client side
export const isClient = typeof window !== 'undefined';

if (pusherClient) {
  pusherClient.connection.bind('connected', () => {
    console.log('Connected to Pusher');
  });

  pusherClient.connection.bind('state_change', (states: any) => {
    console.log('Pusher connection state changed:', states);
  });
} 