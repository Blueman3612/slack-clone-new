import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error("[CHANNELS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return new NextResponse("Forbidden - Admin access required", { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new NextResponse("Channel name is required", { status: 400 });
    }

    // Check if channel already exists
    const existingChannel = await prisma.channel.findFirst({
      where: { name }
    });

    if (existingChannel) {
      return new NextResponse("Channel already exists", { status: 409 });
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        server: {
          connect: {
            name: 'General Server'
          }
        }
      }
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("[CHANNELS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 