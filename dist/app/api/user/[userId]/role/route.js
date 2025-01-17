"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function GET(request, context) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        const { userId } = context.params;
        if (!userId) {
            return new server_1.NextResponse("User ID is required", { status: 400 });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        if (!user) {
            return new server_1.NextResponse("User not found", { status: 404 });
        }
        return server_1.NextResponse.json({ role: user.role });
    }
    catch (error) {
        console.error('Error fetching user role:', error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
