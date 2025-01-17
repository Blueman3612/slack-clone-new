"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNBAKnowledge = updateNBAKnowledge;
exports.getNBAContext = getNBAContext;
const prisma_1 = require("./prisma");
const nba_stats_1 = require("./nba-stats");
async function updateNBAKnowledge() {
    try {
        console.log('Updating NBA knowledge...');
        // Fetch recent games
        const games = await (0, nba_stats_1.getRecentGames)(7); // Get last 7 days of games
        // Format game results for AI consumption
        const gameResults = games.map((game) => {
            const homeTeam = game.home_team.full_name;
            const awayTeam = game.visitor_team.full_name;
            const homeScore = game.home_team_score;
            const awayScore = game.visitor_team_score;
            const status = game.status.toLowerCase() === 'final' ? 'Final' : `${game.period}Q ${game.time}`;
            const date = new Date(game.date);
            let resultPhrase = '';
            if (status === 'Final') {
                const winner = homeScore > awayScore ? homeTeam : awayTeam;
                const loser = homeScore > awayScore ? awayTeam : homeTeam;
                const winnerScore = homeScore > awayScore ? homeScore : awayScore;
                const loserScore = homeScore > awayScore ? awayScore : homeScore;
                resultPhrase = `${winner} defeated ${loser} ${winnerScore}-${loserScore}`;
            }
            else {
                resultPhrase = `${awayTeam} ${awayScore} @ ${homeTeam} ${homeScore} (${status})`;
            }
            return {
                type: 'game_result',
                content: resultPhrase,
                date,
                metadata: {
                    homeTeam,
                    awayTeam,
                    homeScore,
                    awayScore,
                    status,
                    gameId: game.id,
                    winner: homeScore > awayScore ? homeTeam : (awayScore > homeScore ? awayTeam : null)
                }
            };
        });
        // Store the knowledge in the database
        for (const knowledge of gameResults) {
            const data = {
                type: knowledge.type,
                content: knowledge.content,
                date: knowledge.date,
                metadata: JSON.stringify(knowledge.metadata),
                source: 'nba-api',
                category: 'sports'
            };
            await prisma_1.prisma.aIKnowledge.create({
                data
            });
        }
        // Clean up old knowledge
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        await prisma_1.prisma.aIKnowledge.deleteMany({
            where: {
                type: 'game_result',
                source: 'nba-api',
                date: {
                    lt: oneWeekAgo
                }
            }
        });
        console.log(`Successfully updated NBA knowledge with ${gameResults.length} game results`);
        return gameResults;
    }
    catch (error) {
        console.error('Error updating NBA knowledge:', error);
        throw error;
    }
}
async function getNBAContext(query) {
    try {
        // Get recent NBA knowledge relevant to the query
        const knowledge = await prisma_1.prisma.aIKnowledge.findMany({
            where: {
                source: 'nba-api',
                category: 'sports',
                date: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        if (knowledge.length === 0) {
            return 'No recent NBA information available.';
        }
        // Format the knowledge into a readable context
        const context = knowledge.map((k) => {
            const date = k.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            return `[${date}] ${k.content}`;
        }).join('\n');
        return `Recent NBA Games:\n${context}`;
    }
    catch (error) {
        console.error('Error getting NBA context:', error);
        return 'Error retrieving NBA information.';
    }
}
