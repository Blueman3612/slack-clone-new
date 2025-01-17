"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const news_fetcher_1 = require("@/lib/news-fetcher");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
// Helper function to verify cron secret
const isValidCronRequest = (request) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader)
        return false;
    // The token should be: Bearer <CRON_SECRET>
    const [bearer, token] = authHeader.split(' ');
    return bearer === 'Bearer' && token === process.env.CRON_SECRET;
};
// POST - Manual trigger (admin only)
async function POST() {
    var _a, _b;
    try {
        console.log('Starting manual news fetch...');
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        console.log('Session:', {
            user: (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name,
            role: (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.role
        });
        if (!(session === null || session === void 0 ? void 0 : session.user) || session.user.role !== 'ADMIN') {
            console.log('Unauthorized attempt to fetch news');
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        const articles = await (0, news_fetcher_1.fetchAndStoreNBANews)();
        console.log(`Successfully fetched and stored ${articles.length} articles`);
        return server_1.NextResponse.json({ success: true, count: articles.length });
    }
    catch (error) {
        console.error('Detailed error in news fetch route:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
// GET - Cron job trigger
async function GET(request) {
    try {
        console.log('Starting cron news fetch...');
        if (!isValidCronRequest(request)) {
            console.log('Unauthorized cron attempt');
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        const articles = await (0, news_fetcher_1.fetchAndStoreNBANews)();
        console.log(`Successfully fetched and stored ${articles.length} articles`);
        return server_1.NextResponse.json({ success: true, count: articles.length });
    }
    catch (error) {
        console.error('Detailed error in news fetch route:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
