"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const nba_stats_1 = require("@/lib/nba-stats");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
async function GET(request) {
    var _a, _b;
    try {
        console.log('NBA stats API called');
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        console.log('Session:', {
            user: (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name,
            role: (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.role
        });
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            console.log('Unauthorized access attempt');
            return new server_1.NextResponse('Unauthorized', { status: 401 });
        }
        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const id = searchParams.get('id');
        const days = searchParams.get('days');
        console.log('Query parameters:', { type, id, days });
        let data;
        switch (type) {
            case 'games':
                data = await (0, nba_stats_1.getRecentGames)(days ? parseInt(days) : 1);
                console.log(`Fetched ${(data === null || data === void 0 ? void 0 : data.length) || 0} games`);
                break;
            case 'player':
                if (!id) {
                    return server_1.NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
                }
                data = await (0, nba_stats_1.getPlayerStats)(parseInt(id));
                break;
            case 'team':
                if (!id) {
                    return server_1.NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
                }
                data = await (0, nba_stats_1.getTeamStats)(parseInt(id));
                break;
            default:
                return server_1.NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
        }
        return server_1.NextResponse.json(data);
    }
    catch (error) {
        console.error('Detailed error in NBA stats API:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
