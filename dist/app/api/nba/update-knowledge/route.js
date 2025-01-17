"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const nba_knowledge_1 = require("@/lib/nba-knowledge");
async function GET() {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const results = await (0, nba_knowledge_1.updateNBAKnowledge)();
        return server_1.NextResponse.json({
            message: 'NBA knowledge updated successfully',
            gamesProcessed: results.length
        });
    }
    catch (error) {
        console.error('Error updating NBA knowledge:', error);
        return server_1.NextResponse.json({ error: 'Failed to update NBA knowledge' }, { status: 500 });
    }
}
