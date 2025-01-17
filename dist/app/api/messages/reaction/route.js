"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
const pusher_1 = require("@/lib/pusher");
async function POST(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        const { messageId, emoji, chatType, chatId } = await request.json();
        console.log('Received reaction request:', { messageId, emoji, chatType, chatId });
        if (!messageId || !emoji) {
            return new server_1.NextResponse('Missing required fields', { status: 400 });
        }
        const reaction = await prisma_1.prisma.reaction.create({
            data: {
                emoji,
                messageId,
                userId: session.user.id,
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
        console.log('Created reaction:', reaction);
        const channelName = `presence-${chatType}-${chatId}`;
        console.log('Broadcasting to channel:', channelName);
        await pusher_1.pusherServer.trigger(channelName, 'reaction-added', {
            messageId,
            reaction,
        });
        console.log('Broadcasted reaction-added event');
        return server_1.NextResponse.json(reaction);
    }
    catch (error) {
        console.error('Error in reaction POST:', error);
        return new server_1.NextResponse('Internal Server Error', { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        // Get reactionId from the URL
        const url = new URL(request.url);
        const reactionId = url.searchParams.get('reactionId');
        const { chatType, chatId } = await request.json();
        if (!reactionId) {
            return new server_1.NextResponse('Missing reaction ID', { status: 400 });
        }
        // Get the reaction to check ownership and get messageId
        const reaction = await prisma_1.prisma.reaction.findUnique({
            where: { id: reactionId },
            select: { userId: true, messageId: true },
        });
        if (!reaction) {
            return new server_1.NextResponse('Reaction not found', { status: 404 });
        }
        // Only allow users to remove their own reactions
        if (reaction.userId !== session.user.id) {
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        // Delete the reaction
        await prisma_1.prisma.reaction.delete({
            where: { id: reactionId },
        });
        // Use consistent channel naming
        const channelName = `presence-${chatType}-${chatId}`;
        // Trigger the reaction-removed event
        await pusher_1.pusherServer.trigger(channelName, 'reaction-removed', {
            messageId: reaction.messageId,
            reactionId,
        });
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error('Error removing reaction:', error);
        return new server_1.NextResponse('Internal Server Error', { status: 500 });
    }
}
