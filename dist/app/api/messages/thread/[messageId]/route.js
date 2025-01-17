"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function GET(req, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const messageId = params.messageId;
        if (!messageId) {
            return new server_1.NextResponse("Message ID required", { status: 400 });
        }
        const replies = await prisma_1.prisma.message.findMany({
            where: {
                threadId: messageId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return server_1.NextResponse.json(replies);
    }
    catch (error) {
        console.error("[THREAD_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(request, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const { content } = body;
        if (!content) {
            return new server_1.NextResponse("Content is required", { status: 400 });
        }
        // Get the parent message to check channel
        const parentMessage = await prisma_1.prisma.message.findUnique({
            where: { id: params.messageId },
            select: {
                channelId: true,
                userId: true,
            },
        });
        if (!parentMessage) {
            return new server_1.NextResponse("Parent message not found", { status: 404 });
        }
        const reply = await prisma_1.prisma.message.create({
            data: {
                content,
                userId: session.user.id,
                channelId: parentMessage.channelId,
                threadId: params.messageId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });
        // Trigger Pusher event for real-time updates
        await pusherServer.trigger(`channel-${parentMessage.channelId}`, 'thread-reply', {
            messageId: params.messageId,
            reply,
        });
        return server_1.NextResponse.json(reply);
    }
    catch (error) {
        console.error("[THREAD_MESSAGES_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
