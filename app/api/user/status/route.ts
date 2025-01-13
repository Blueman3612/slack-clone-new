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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { emoji, text } = body;

    const status = await prisma.userStatus.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        emoji,
        text,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        emoji,
        text
      }
    });

    // Trigger real-time update
    await pusherServer.trigger('user-status', 'status-update', {
      userId: session.user.id,
      status: {
        emoji,
        text
      }
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("[USER_STATUS_POST]", { error });
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.userStatus.delete({
      where: {
        userId: session.user.id
      }
    });

    // Trigger real-time deletion
    await pusherServer.trigger('user-status', 'status-deleted', {
      userId: session.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[USER_STATUS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete status" }, { status: 500 });
  }
} 