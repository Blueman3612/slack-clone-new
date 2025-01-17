"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const ai_chat_1 = require("@/lib/ai-chat");
async function POST(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            console.error('No session found');
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        console.log('Blueman API received request:', body);
        const { message } = body;
        if (!message) {
            console.error('No message provided');
            return server_1.NextResponse.json({ error: "Message is required" }, { status: 400 });
        }
        console.log('Creating Blueman chat...');
        const chat = await (0, ai_chat_1.createBluemanChat)(session.user.id);
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
                }
                catch (err) {
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
    }
    catch (err) {
        console.error("[BLUEMAN_CHAT]", err);
        return server_1.NextResponse.json({ error: "An error occurred while processing your request" }, { status: 500 });
    }
}
