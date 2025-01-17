"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const pusher_1 = require("@/lib/pusher");
const auth_1 = require("@/lib/auth");
async function GET(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const threadId = searchParams.get("threadId");
        if (!threadId) {
            return new server_1.NextResponse("Thread ID required", { status: 400 });
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                threadId: threadId,
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
        return server_1.NextResponse.json(messages);
    }
    catch (error) {
        console.error("[THREAD_MESSAGES_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const { content, threadId } = body;
        if (!content || !threadId) {
            return new server_1.NextResponse("Missing required fields", { status: 400 });
        }
        // Get the parent message to check channel
        const parentMessage = await prisma_1.prisma.message.findUnique({
            where: { id: threadId },
            select: {
                channelId: true,
                userId: true,
            },
        });
        if (!parentMessage) {
            return new server_1.NextResponse("Parent message not found", { status: 404 });
        }
        // Create reply first
        const reply = await prisma_1.prisma.message.create({
            data: {
                content,
                userId: session.user.id,
                channelId: parentMessage.channelId,
                threadId: threadId,
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
        });
        // Get thread count
        const threadCount = await prisma_1.prisma.message.count({
            where: { threadId }
        });
        // Update parent message's thread messages count
        await prisma_1.prisma.$executeRaw `UPDATE Message SET replyCount = ${threadCount} WHERE id = ${threadId}`;
        // Trigger real-time updates
        const threadChannel = `presence-thread-${threadId}`;
        const mainChannel = parentMessage.channelId
            ? `presence-channel-${parentMessage.channelId}`
            : `presence-dm-${[session.user.id, parentMessage.userId].sort().join('-')}`;
        // Send new message to thread channel
        await pusher_1.pusherServer.trigger(threadChannel, 'new-message', reply);
        // Send thread update to main channel (only update the thread count)
        await pusher_1.pusherServer.trigger(mainChannel, 'thread-update', {
            messageId: threadId,
            replyCount: threadCount,
            lastReply: {
                content: reply.content,
                user: reply.user,
                createdAt: reply.createdAt
            }
        });
        return server_1.NextResponse.json(Object.assign(Object.assign({}, reply), { replyCount: threadCount }));
    }
    catch (error) {
        console.error("[THREAD_MESSAGES_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
