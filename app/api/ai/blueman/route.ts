import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBluemanChat } from "@/lib/ai-chat";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('No session found');
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    console.log('Blueman API received request:', body);

    const { message } = body;
    if (!message) {
      console.error('No message provided');
      return new NextResponse("Message is required", { status: 400 });
    }

    console.log('Creating Blueman chat...');
    const chat = await createBluemanChat();
    
    console.log('Getting response for:', message);
    const response = await chat(message);
    console.log('Got response:', response);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("[BLUEMAN_CHAT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 