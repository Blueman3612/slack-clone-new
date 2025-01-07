import { NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher"

export async function GET() {
  try {
    await pusherServer.trigger('chat', 'test', {
      message: 'Test message'
    })
    
    return NextResponse.json({ 
      success: true,
      config: {
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        appId: process.env.PUSHER_APP_ID?.slice(0, 4) + '...',
      }
    })
  } catch (error) {
    console.error('Pusher test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        appId: process.env.PUSHER_APP_ID?.slice(0, 4) + '...',
      }
    }, { status: 500 })
  }
} 