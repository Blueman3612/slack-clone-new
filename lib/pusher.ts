import PusherClient from 'pusher-js'
import PusherServer from 'pusher'

// Server-side Pusher instance
export const pusher = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance with type safety
const pusherClient = typeof window !== 'undefined' 
  ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      authEndpoint: '/api/pusher/auth',
    })
  : null;

if (pusherClient) {
  pusherClient.connection.bind('connected', () => {
    console.log('Connected to Pusher');
  });

  pusherClient.connection.bind('state_change', (states: any) => {
    console.log('Pusher connection state changed:', states);
  });
}

export { pusherClient }; 