"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const auth_1 = require("@/lib/auth");
async function PATCH(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user) || session.user.role !== "ADMIN") {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const { userId, role } = body;
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { role },
        });
        return server_1.NextResponse.json(updatedUser);
    }
    catch (error) {
        console.error("[USER_ROLE_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
