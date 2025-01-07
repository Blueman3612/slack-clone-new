import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return new NextResponse('Channel name is required', { status: 400 });
    }

    // Check if channel already exists
    const existingChannel = await prisma.channel.findFirst({
      where: {
        name: name.toLowerCase()
      }
    });

    if (existingChannel) {
      return new NextResponse('Channel already exists', { status: 400 });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.toLowerCase(),
        members: {
          connect: {
            id: session.user.id
          }
        }
      }
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error creating channel:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 