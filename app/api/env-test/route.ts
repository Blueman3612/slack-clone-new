import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasAppId: !!process.env.PUSHER_APP_ID,
    hasSecret: !!process.env.PUSHER_SECRET,
    hasKey: !!process.env.NEXT_PUBLIC_PUSHER_KEY,
    hasCluster: !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    appIdPrefix: process.env.PUSHER_APP_ID?.slice(0, 4),
    keyPrefix: process.env.NEXT_PUBLIC_PUSHER_KEY?.slice(0, 4),
  })
} 