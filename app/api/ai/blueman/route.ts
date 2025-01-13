import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBluemanChat } from "@/lib/ai-chat";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { message } = await request.json();
    if (!message) {
      return new NextResponse("Message is required", { status: 400 });
    }

    const chat = await createBluemanChat();
    const response = await chat(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("[BLUEMAN_CHAT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 