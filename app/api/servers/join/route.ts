import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { name, password } = body;

    if (!name || !password) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Find the server
    const server = await prisma.server.findUnique({
      where: { name },
      include: {
        members: {
          select: { id: true }
        }
      }
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    // Check if user is already a member
    if (server.members.some(member => member.id === userId)) {
      return new NextResponse("Already a member of this server", { status: 400 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, server.password);
    if (!isPasswordValid) {
      return new NextResponse("Invalid password", { status: 401 });
    }

    // Add user to server
    const updatedServer = await prisma.server.update({
      where: { id: server.id },
      data: {
        members: {
          connect: { id: userId }
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
            channels: true,
          }
        }
      }
    });

    return NextResponse.json(updatedServer);
  } catch (error) {
    console.error("[SERVER_JOIN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 