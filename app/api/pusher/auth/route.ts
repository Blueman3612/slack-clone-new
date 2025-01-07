import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.text();
    const [socketId, channel] = body.split(":");

    const authResponse = pusherServer.authorizeChannel(
      socketId,
      channel,
      {
        user_id: session.user.id,
        user_info: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      }
    );

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