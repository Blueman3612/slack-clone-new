"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
const rate_limit_1 = require("@/lib/rate-limit");
async function GET(request, { params }) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        const userId = params.userId;
        if (!userId) {
            return new server_1.NextResponse("User ID is required", { status: 400 });
        }
        // Use the rate limiter
        if (!rate_limit_1.rateLimit.check(`status_${userId}`, 5, 10000)) {
            return server_1.NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
        }
        const status = await prisma_1.prisma.userStatus.findUnique({
            where: {
                userId
            }
        });
        return server_1.NextResponse.json(status);
    }
    catch (error) {
        console.error("[USER_STATUS_GET]", error);
        return server_1.NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
