"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentGames = getRecentGames;
exports.formatGameResult = formatGameResult;
const API_BASE_URL = 'https://cdn.nba.com/static/json/liveData';
async function fetchGamesForDate(date) {
    const url = `${API_BASE_URL}/scoreboard/todaysScoreboard_00.json`;
    console.log('Requesting games from URL:', url);
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'GauntletAI-NBA-Stats/1.0'
        },
        cache: 'no-store'
    });
    if (!response.ok) {
        console.error('NBA API Error:', {
            status: response.status,
            statusText: response.statusText
        });
        return [];
    }
    const data = await response.json();
    console.log('Raw response:', JSON.stringify(data, null, 2));
    if (!data.scoreboard || !data.scoreboard.games) {
        console.log(`No games data in response`);
        return [];
    }
    return data.scoreboard.games.map((game) => ({
        id: game.gameId,
        date: game.gameTimeUTC,
        home_team: {
            id: game.homeTeam.teamId,
            name: game.homeTeam.teamName,
            full_name: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
            abbreviation: game.homeTeam.teamTricode
        },
        home_team_score: game.homeTeam.score,
        visitor_team: {
            id: game.awayTeam.teamId,
            name: game.awayTeam.teamName,
            full_name: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
            abbreviation: game.awayTeam.teamTricode
        },
        visitor_team_score: game.awayTeam.score,
        status: game.gameStatusText,
        period: game.period,
        time: game.gameClock || ''
    }));
}
async function getRecentGames(days = 7) {
    try {
        const games = await fetchGamesForDate('today');
        console.log(`Processed ${games.length} games`);
        return games;
    }
    catch (error) {
        console.error('Detailed error in getRecentGames:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        throw error;
    }
}
function formatGameResult(game) {
    const homeTeam = game.home_team.abbreviation;
    const visitorTeam = game.visitor_team.abbreviation;
    const status = game.status === 'Final'
        ? 'Final'
        : `${game.period}Q ${game.time}`;
    return `${visitorTeam} ${game.visitor_team_score} @ ${homeTeam} ${game.home_team_score} (${status})`;
}
