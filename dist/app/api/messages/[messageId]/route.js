"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const pusher_1 = require("@/lib/pusher");
const auth_1 = require("@/lib/auth");
async function DELETE(request, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const messageId = params.messageId;
        // Get the message and check permissions
        const message = await prisma_1.prisma.message.findUnique({
            where: { id: messageId },
            include: {
                user: {
                    select: { role: true }
                }
            }
        });
        if (!message) {
            return new server_1.NextResponse("Message not found", { status: 404 });
        }
        // For direct messages, only allow the message owner to delete
        if (message.receiverId) {
            if (message.userId !== session.user.id) {
                return new server_1.NextResponse("You can only delete your own messages in direct messages", { status: 403 });
            }
        }
        else {
            // For channel messages, allow admin or message owner
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: session.user.id },
                select: { role: true }
            });
            if (message.userId !== session.user.id && (user === null || user === void 0 ? void 0 : user.role) !== "ADMIN") {
                return new server_1.NextResponse("Forbidden", { status: 403 });
            }
        }
        // Start a transaction to handle all deletion operations
        await prisma_1.prisma.$transaction(async (tx) => {
            // If this is a thread reply, get the parent message to update its count
            if (message.threadId) {
                // Delete the reply
                await tx.message.delete({
                    where: { id: messageId }
                });
                // Count remaining replies
                const remainingReplies = await tx.message.count({
                    where: { threadId: message.threadId }
                });
                // Get the parent message to determine the main channel
                const parentMessage = await tx.message.findUnique({
                    where: { id: message.threadId }
                });
                if (parentMessage) {
                    // Get the main channel name
                    const mainChannelName = parentMessage.channelId
                        ? `presence-channel-${parentMessage.channelId}`
                        : `presence-dm-${[parentMessage.userId, parentMessage.receiverId].sort().join('-')}`;
                    // Send thread update to both channels
                    const threadUpdate = {
                        messageId: message.threadId,
                        replyCount: remainingReplies,
                        lastReply: null
                    };
                    await Promise.all([
                        // Update thread channel
                        pusher_1.pusherServer.trigger(`presence-thread-${message.threadId}`, 'thread-update', threadUpdate),
                        // Update main channel
                        pusher_1.pusherServer.trigger(mainChannelName, 'thread-update', threadUpdate)
                    ]);
                }
            }
            else {
                // Delete all replies in the thread first
                await tx.message.deleteMany({
                    where: { threadId: messageId }
                });
                // Then delete the parent message
                await tx.message.delete({
                    where: { id: messageId }
                });
            }
        });
        // Trigger Pusher event for real-time deletion
        const channelName = message.channelId
            ? `presence-channel-${message.channelId}`
            : `presence-dm-${[message.userId, message.receiverId].sort().join('-')}`;
        // Send deletion event to main channel
        await pusher_1.pusherServer.trigger(channelName, 'new-message', {
            type: 'message-delete',
            messageId: message.id,
            threadDeleted: !message.threadId
        });
        // If this is a thread message, also send event to thread channel
        if (message.threadId) {
            await pusher_1.pusherServer.trigger(`presence-thread-${message.threadId}`, 'new-message', {
                type: 'message-delete',
                messageId: message.id,
                threadId: message.threadId
            });
        }
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[MESSAGE_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
