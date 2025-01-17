"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.OPTIONS = OPTIONS;
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
        const data = await request.text();
        const [socketId, channel] = data.split('&').map(str => str.split('=')[1]);
        const authResponse = pusher_1.pusherServer.authorizeChannel(socketId, channel, {
            user_id: session.user.id,
            user_info: {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
            },
        });
        return server_1.NextResponse.json(authResponse);
    }
    catch (error) {
        console.error("[PUSHER_AUTH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function OPTIONS(request) {
    return new server_1.NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
