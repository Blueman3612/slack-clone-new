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
        const userId = params === null || params === void 0 ? void 0 : params.userId;
        if (!userId) {
            return new server_1.NextResponse("User ID is required", { status: 400 });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                isAI: true
            }
        });
        if (!user) {
            return new server_1.NextResponse("User not found", { status: 404 });
        }
        return server_1.NextResponse.json(user);
    }
    catch (error) {
        console.error("[USER_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
