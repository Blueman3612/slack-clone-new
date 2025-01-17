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
        const channelId = searchParams.get("channelId");
        const receiverId = searchParams.get("receiverId");
        if (!channelId && !receiverId) {
            return new server_1.NextResponse("Channel ID or Receiver ID required", { status: 400 });
        }
        // Query based on message type
        const messages = await prisma_1.prisma.message.findMany({
            where: channelId ? {
                channelId: channelId,
                threadId: null, // Only get main messages, not replies
            } : {
                OR: [
                    {
                        userId: session.user.id,
                        receiverId: receiverId,
                        threadId: null,
                    },
                    {
                        userId: receiverId,
                        receiverId: session.user.id,
                        threadId: null,
                    },
                ],
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        role: true,
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
                threadMessages: {
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        const transformedMessages = messages.map(message => (Object.assign(Object.assign({}, message), { replyCount: message.threadMessages.length, isThreadStarter: message.threadMessages.length > 0 })));
        return server_1.NextResponse.json(transformedMessages);
    }
    catch (error) {
        console.error("[MESSAGES_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(request) {
    var _a;
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const { content, channelId, receiverId, userId } = body;
        console.log('Message creation attempt:', { content, channelId, receiverId, userId });
        if (!(content === null || content === void 0 ? void 0 : content.trim())) {
            return server_1.NextResponse.json({ error: "Message content is required" }, { status: 400 });
        }
        // Use provided userId (for Blueman responses) or session user id
        const messageUserId = userId || session.user.id;
        // Verify user exists (either sender or Blueman)
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: messageUserId }
        });
        if (!user) {
            return server_1.NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        // Keep all existing verification logic
        if (channelId) {
            const channel = await prisma_1.prisma.channel.findUnique({
                where: { id: channelId }
            });
            if (!channel) {
                return server_1.NextResponse.json({ error: "Channel not found" }, { status: 404 });
            }
        }
        if (receiverId) {
            const receiver = await prisma_1.prisma.user.findUnique({
                where: { id: receiverId }
            });
            if (!receiver) {
                return server_1.NextResponse.json({ error: "Receiver not found" }, { status: 404 });
            }
        }
        // Create message with proper data structure
        const messageData = Object.assign(Object.assign({ content: content.trim(), userId: messageUserId, isThreadStarter: false, replyCount: 0 }, (channelId ? { channelId } : {})), (receiverId ? { receiverId } : {}));
        console.log('Creating message with data:', messageData);
        const message = await prisma_1.prisma.message.create({
            data: messageData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        role: true
                    }
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                }
            }
        });
        // Trigger Pusher event for real-time updates
        const channelName = channelId
            ? `presence-channel-${channelId}`
            : `presence-dm-${[session.user.id, receiverId].sort().join('-')}`;
        await pusher_1.pusherServer.trigger(channelName, 'new-message', Object.assign(Object.assign({}, message), { reactions: message.reactions || [], user: Object.assign(Object.assign({}, message.user), { role: message.user.role || 'USER' }) }));
        return server_1.NextResponse.json(message);
    }
    catch (error) {
        console.error("[MESSAGES_POST]", error);
        return server_1.NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
