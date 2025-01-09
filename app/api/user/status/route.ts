import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { emoji, text, expiresAt } = await req.json()

    const status = await prisma.userStatus.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        emoji,
        text,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      create: {
        userId: session.user.id,
        emoji,
        text,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('Status update error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request) {
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Status delete error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 