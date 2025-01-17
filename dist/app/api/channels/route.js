"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const auth_1 = require("@/lib/auth");
async function GET(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const channels = await prisma_1.prisma.channel.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        return server_1.NextResponse.json(channels);
    }
    catch (error) {
        console.error("[CHANNELS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        // Check if user is admin
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });
        if ((user === null || user === void 0 ? void 0 : user.role) !== 'ADMIN') {
            return new server_1.NextResponse("Forbidden - Admin access required", { status: 403 });
        }
        const body = await request.json();
        const { name } = body;
        if (!name) {
            return new server_1.NextResponse("Channel name is required", { status: 400 });
        }
        // Check if channel already exists
        const existingChannel = await prisma_1.prisma.channel.findFirst({
            where: { name }
        });
        if (existingChannel) {
            return new server_1.NextResponse("Channel already exists", { status: 409 });
        }
        const channel = await prisma_1.prisma.channel.create({
            data: {
                name,
                server: {
                    connect: {
                        name: 'General Server'
                    }
                }
            }
        });
        return server_1.NextResponse.json(channel);
    }
    catch (error) {
        console.error("[CHANNELS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
