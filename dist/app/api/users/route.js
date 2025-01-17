"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
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
        const users = await prisma_1.prisma.user.findMany({
            where: {
                NOT: {
                    id: session.user.id,
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                isAI: true,
            },
        });
        return server_1.NextResponse.json(users);
    }
    catch (error) {
        console.error("[USERS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
