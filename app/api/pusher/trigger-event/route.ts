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

    const body = await request.json();
    const { channel, event, data } = body;

    await pusherServer.trigger(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUSHER_TRIGGER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 