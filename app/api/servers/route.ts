import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";

async function ensureGeneralServer() {
  const generalServer = await prisma.server.findFirst({
    where: { name: 'General Server' }
  });

  if (!generalServer) {
    // Create the general server with a default admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.error('No admin user found to create General Server');
      return null;
    }

    return await prisma.server.create({
      data: {
        name: 'General Server',
        displayName: 'General Server',
        password: await bcrypt.hash('general-server', 12),
        owner: {
          connect: { id: adminUser.id }
        },
        members: {
          connect: [{ id: adminUser.id }]
        },
        channels: {
          create: [
            { name: 'general' }
          ]
        }
      },
      include: {
        channels: true,
        owner: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            members: true,
            channels: true
          }
        }
      }
    });
  }

  return generalServer;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, password } = body;

    if (!name?.trim() || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if server name already exists
    const existingServer = await prisma.server.findFirst({
      where: {
        name: trimmedName
      }
    });

    if (existingServer) {
      return NextResponse.json({ 
        error: "A server with this name already exists" 
      }, { status: 409 });
    }

    // First, verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create the server with proper owner connection
    const server = await prisma.server.create({
      data: {
        name: trimmedName,
        displayName: trimmedName,
        password: await bcrypt.hash(password, 12),
        owner: {
          connect: { id: userId }
        },
        members: {
          connect: [{ id: userId }]
        },
        channels: {
          create: [
            { name: 'general' }
          ]
        }
      },
      include: {
        channels: true,
        _count: {
          select: {
            members: true,
            channels: true
          }
        }
      }
    });

    return NextResponse.json(server);
  } catch (error) {
    console.error('[SERVERS_POST]', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    });
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create server" 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure General Server exists
    await ensureGeneralServer();

    console.log('Fetching servers for user:', userId);

    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: {
            id: userId
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          }
        },
        channels: true,
        _count: {
          select: {
            members: true,
            channels: true,
          }
        }
      }
    });

    console.log('Found servers:', servers);

    return NextResponse.json(servers);
  } catch (error) {
    console.error("[SERVERS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 