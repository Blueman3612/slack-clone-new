import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_PUSHER_APP_KEY: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    // Don't expose sensitive variables in production!
    PUSHER_APP_ID: process.env.PUSHER_APP_ID?.slice(0, 4) + '...',
    PUSHER_SECRET: 'hidden',
  });
} 