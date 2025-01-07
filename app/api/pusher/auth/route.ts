import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log("No session found in Pusher auth");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const socketId = formData.get('socket_id');
    const channel = formData.get('channel_name');

    console.log("Authorizing channel:", {
      socketId,
      channel,
      userId: session.user.id,
      userName: session.user.name
    });

    const presenceData = {
      user_id: session.user.id,
      user_info: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      }
    };

    try {
      const authResponse = pusher.authorizeChannel(
        socketId as string,
        channel as string,
        presenceData
      );
      
      console.log("Auth response:", authResponse);
      return NextResponse.json(authResponse);
    } catch (error) {
      console.error("Pusher authorize error:", error);
      return new NextResponse("Pusher authorization failed", { status: 500 });
    }

  } catch (error) {
    console.error("Pusher auth error:", error);
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