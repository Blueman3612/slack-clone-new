import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pusher } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the raw body text
    const text = await request.text();
    
    // Parse the URL-encoded body manually
    const params = new URLSearchParams(text);
    const socketId = params.get('socket_id');
    const channel = params.get('channel_name');

    if (!socketId || !channel) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Prepare user data for Pusher
    const userData = {
      user_id: user.id,
      user_info: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };

    // Generate auth response
    const authResponse = pusher.authorizeChannel(socketId, channel, userData);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[PUSHER_AUTH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 