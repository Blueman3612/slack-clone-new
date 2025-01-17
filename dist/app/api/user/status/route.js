"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
const pusher_1 = require("@/lib/pusher");
async function GET(req) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        const status = await prisma_1.prisma.userStatus.findUnique({
            where: {
                userId: session.user.id
            }
        });
        return server_1.NextResponse.json(status);
    }
    catch (error) {
        console.error('Status fetch error:', error);
        return new server_1.NextResponse('Internal Error', { status: 500 });
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
        const { emoji, text } = body;
        const status = await prisma_1.prisma.userStatus.upsert({
            where: {
                userId: session.user.id
            },
            update: {
                emoji,
                text,
                updatedAt: new Date()
            },
            create: {
                userId: session.user.id,
                emoji,
                text
            }
        });
        // Trigger real-time update with correct channel name
        await pusher_1.pusherServer.trigger('presence-user-status', 'new-message', {
            type: 'status-update',
            userId: session.user.id,
            status: {
                emoji,
                text
            }
        });
        return server_1.NextResponse.json(status);
    }
    catch (error) {
        console.error("[USER_STATUS_POST]", { error });
        return server_1.NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}
async function DELETE(request) {
    var _a;
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await prisma_1.prisma.userStatus.delete({
            where: {
                userId: session.user.id
            }
        });
        // Trigger real-time deletion with correct channel name
        await pusher_1.pusherServer.trigger('presence-user-status', 'new-message', {
            type: 'status-delete',
            userId: session.user.id
        });
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[USER_STATUS_DELETE]", error);
        return server_1.NextResponse.json({ error: "Failed to delete status" }, { status: 500 });
    }
}
