"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
async function GET() {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        const articles = await prisma_1.prisma.newsArticle.findMany({
            orderBy: {
                publishedAt: 'desc'
            },
            take: 100 // Limit to 100 most recent articles
        });
        return server_1.NextResponse.json(articles);
    }
    catch (error) {
        console.error('Error fetching news articles:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch news articles' }, { status: 500 });
    }
}
