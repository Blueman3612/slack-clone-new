import { NextResponse } from "next/server";

export async function GET() {
  // Log all environment variables
  console.log('Server-side environment variables:', {
    NEXT_PUBLIC_PUSHER_APP_KEY: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_SECRET: 'hidden',
  });

  return NextResponse.json({
    NEXT_PUBLIC_PUSHER_APP_KEY: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'not set',
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'not set',
    PUSHER_APP_ID: (process.env.PUSHER_APP_ID || 'not set').slice(0, 4) + '...',
    PUSHER_SECRET: 'hidden',
  });
} 