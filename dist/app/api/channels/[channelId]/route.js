"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const auth_1 = require("@/lib/auth");
async function GET(request, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const channelId = params.channelId;
        const channel = await prisma_1.prisma.channel.findUnique({
            where: { id: channelId },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!channel) {
            return new server_1.NextResponse("Channel not found", { status: 404 });
        }
        return server_1.NextResponse.json(channel);
    }
    catch (error) {
        console.error("[CHANNEL_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
