import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
    forceTLS: true,
  }
);

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