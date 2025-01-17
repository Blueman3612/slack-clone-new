"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const pusher_1 = require("@/lib/pusher");
const auth_1 = require("@/lib/auth");
async function POST(request, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const { emoji, chatType, chatId } = body;
        const messageId = params.messageId;
        if (!emoji) {
            return new server_1.NextResponse("Emoji is required", { status: 400 });
        }
        // First check if the message exists and get its type
        const message = await prisma_1.prisma.message.findUnique({
            where: { id: params.messageId },
            select: {
                id: true,
                channelId: true,
                userId: true,
                receiverId: true,
                threadId: true,
            }
        });
        if (!message) {
            return new server_1.NextResponse("Message not found", { status: 404 });
        }
        // Create or remove reaction
        const existingReaction = await prisma_1.prisma.reaction.findFirst({
            where: {
                messageId: params.messageId,
                userId: session.user.id,
                emoji,
            },
        });
        let reaction;
        if (existingReaction) {
            // Remove reaction if it already exists
            reaction = await prisma_1.prisma.reaction.delete({
                where: {
                    id: existingReaction.id,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
            });
        }
        else {
            // Create new reaction
            reaction = await prisma_1.prisma.reaction.create({
                data: {
                    emoji,
                    userId: session.user.id,
                    messageId: params.messageId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
            });
        }
        // Get updated message with reactions
        const updatedMessage = await prisma_1.prisma.message.findUnique({
            where: {
                id: params.messageId,
            },
            include: {
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
        if (updatedMessage) {
            // Determine if the message is part of a thread
            const isThreadMessage = Boolean(message.threadId);
            // Get the main channel name based on message type
            const mainChannelName = message.channelId
                ? `presence-channel-${message.channelId}`
                : `presence-dm-${[message.userId, message.receiverId].sort().join('-')}`;
            // Send the appropriate event based on whether we're adding or removing
            const eventName = existingReaction ? 'reaction-removed' : 'reaction-added';
            const eventData = {
                messageId: messageId,
                reaction: Object.assign(Object.assign({}, (reaction || existingReaction)), { id: existingReaction ? existingReaction.id : reaction === null || reaction === void 0 ? void 0 : reaction.id })
            };
            // Always send to main channel
            await pusher_1.pusherServer.trigger(mainChannelName, eventName, eventData);
            // If it's a thread message, also send to thread channel
            if (isThreadMessage && message.threadId) {
                await pusher_1.pusherServer.trigger(`presence-thread-${message.threadId}`, eventName, eventData);
                // Also send to parent message's channel to update the thread preview
                const parentMessage = await prisma_1.prisma.message.findUnique({
                    where: { id: message.threadId },
                    select: { channelId: true, userId: true, receiverId: true }
                });
                if (parentMessage) {
                    const parentChannelName = parentMessage.channelId
                        ? `presence-channel-${parentMessage.channelId}`
                        : `presence-dm-${[parentMessage.userId, parentMessage.receiverId].sort().join('-')}`;
                    // Only send to parent channel if it's different from the current channel
                    if (parentChannelName !== mainChannelName) {
                        await pusher_1.pusherServer.trigger(parentChannelName, eventName, eventData);
                    }
                }
            }
        }
        return server_1.NextResponse.json(reaction || existingReaction);
    }
    catch (error) {
        console.error("[MESSAGE_REACTION_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function GET(request, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const reactions = await prisma_1.prisma.reaction.findMany({
            where: {
                messageId: params.messageId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });
        return server_1.NextResponse.json(reactions);
    }
    catch (error) {
        console.error("[REACTIONS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
