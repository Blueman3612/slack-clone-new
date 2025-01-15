import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBluemanChat } from "@/lib/ai-chat";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log('Blueman API received request:', body);

    const { message } = body;
    if (!message) {
      console.error('No message provided');
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    console.log('Creating Blueman chat...');
    const chat = await createBluemanChat(session.user.id);
    
    console.log('Getting response for:', message);
    
    // Use Response object for streaming
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          await chat(message, {
            onToken: (token) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`));
            },
            onComplete: () => {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
            onError: (err) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
              controller.close();
            }
          });
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error("[BLUEMAN_CHAT]", err);
    return NextResponse.json(
      { error: "An error occurred while processing your request" }, 
      { status: 500 }
    );
  }
} 