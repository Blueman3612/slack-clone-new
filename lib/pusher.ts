import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

// Debug logging
console.log('Environment variables:', {
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  // Don't log sensitive values in production
  HAS_APP_ID: !!process.env.PUSHER_APP_ID,
  HAS_SECRET: !!process.env.PUSHER_SECRET
});

if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
  throw new Error('NEXT_PUBLIC_PUSHER_KEY is not defined');
}

if (!process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
  throw new Error('NEXT_PUBLIC_PUSHER_CLUSTER is not defined');
}

// Enable Pusher logging
PusherClient.logToConsole = true;

// Server-side Pusher instance
export const pusher = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
    auth: {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    activityTimeout: 30000,
    pongTimeout: 15000,
  }
);

// Add connection event handlers
pusherClient.connection.bind('connected', () => {
  console.log('Connected to Pusher');
});

pusherClient.connection.bind('error', (error: any) => {
  console.error('Pusher connection error:', error);
});

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Pusher environment variables:', {
    appId: !!process.env.PUSHER_APP_ID,
    key: !!process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: !!process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  });

  pusherClient.connection.bind('state_change', (states: any) => {
    console.log('Pusher connection state changed:', states);
  });
}

// Add subscription debugging
pusherClient.bind('pusher:subscription_succeeded', (data: any) => {
  console.log('Successfully subscribed to channel:', data);
});

pusherClient.bind('pusher:subscription_error', (error: any) => {
  console.error('Subscription error:', error);
});

// Add message event handler
pusherClient.bind('message:new', (data: any) => {
  console.log('New message received:', data);
}); 