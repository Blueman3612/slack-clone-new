import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from "@/lib/pusher"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const status = await prisma.userStatus.findUnique({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('Status fetch error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { emoji, text } = body

    const status = await prisma.userStatus.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        emoji,
        text,
      },
      create: {
        userId: session.user.id,
        emoji,
        text,
      },
    })

    // Trigger status update event
    await pusherServer.trigger('user-status', 'status-update', {
      userId: session.user.id,
      status: {
        emoji,
        text,
      }
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error("[USER_STATUS_POST]", error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await prisma.userStatus.delete({
      where: {
        userId: session.user.id
      }
    })

    // Trigger status clear event
    await pusherServer.trigger('user-status', 'status-update', {
      userId: session.user.id,
      status: null
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[USER_STATUS_DELETE]", error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 