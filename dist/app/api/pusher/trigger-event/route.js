"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const pusher_1 = require("@/lib/pusher");
const auth_1 = require("@/lib/auth");
async function POST(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const { channel, event, data } = body;
        await pusher_1.pusherServer.trigger(channel, event, data);
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("[PUSHER_TRIGGER]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
