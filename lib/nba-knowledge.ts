import { prisma } from './prisma';
import { getRecentGames, TransformedGame } from './nba-stats';

interface NBAKnowledge {
  type: 'game_result' | 'standings' | 'stats';
  content: string;
  date: Date;
  metadata: Record<string, any>;
}

interface AIKnowledgeData {
  type: string;
  content: string;
  date: Date;
  metadata: string;
  source: string;
  category: string;
}

// Add this helper function to format dates in EST
function formatDateInEST(date: string): string {
  const estDate = new Date(date).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return estDate;
}

// Update the formatGameResult function to use EST
function formatGameResult(game: any): string {
  const estDate = formatDateInEST(game.date);
  return `${game.homeTeam.name} vs ${game.awayTeam.name} on ${estDate}: ${game.homeTeam.name} ${game.homeTeamScore} - ${game.awayTeam.name} ${game.awayTeamScore}`;
}

export async function updateNBAKnowledge() {
  try {
    console.log('Starting NBA knowledge update...');
    
    // Fetch all games using our improved function
    const games = await getRecentGames();
    console.log(`Fetched ${games.length} games from NBA API`);
    
    if (games.length === 0) {
      console.log('No games fetched from API');
      return [];
    }
    
    console.log('Sample game data from API:', games[0]);
    
    // Format game results for AI consumption
    const gameResults = games.map((game: TransformedGame) => {
      const homeTeam = game.home_team.full_name;
      const awayTeam = game.visitor_team.full_name;
      const homeScore = game.home_team_score;
      const awayScore = game.visitor_team_score;
      const status = game.status.toLowerCase() === 'final' ? 'Final' : `${game.period}Q ${game.time}`;
      
      // Add one day to the date to match the actual game date in EST
      const date = new Date(game.date);
      date.setDate(date.getDate() + 1);
      
      let resultPhrase = '';
      if (status === 'Final') {
        const winner = homeScore > awayScore ? homeTeam : awayTeam;
        const loser = homeScore > awayScore ? awayTeam : homeTeam;
        const winnerScore = homeScore > awayScore ? homeScore : awayScore;
        const loserScore = homeScore > awayScore ? awayScore : homeScore;
        resultPhrase = `${winner} defeated ${loser} ${winnerScore}-${loserScore}`;
      } else {
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
      } as NBAKnowledge;
    });

    console.log(`Formatted ${gameResults.length} game results`);
    console.log('Sample formatted game:', gameResults[0]);

    // Clean up old knowledge first
    const deletedCount = await prisma.aIKnowledge.deleteMany({
      where: {
        type: 'game_result',
        source: 'nba-api'
      }
    });
    console.log(`Deleted ${deletedCount.count} old game records`);

    // Store the knowledge in the database
    let successCount = 0;
    for (const knowledge of gameResults) {
      const data: AIKnowledgeData = {
        type: knowledge.type,
        content: knowledge.content,
        date: knowledge.date,
        metadata: JSON.stringify(knowledge.metadata),
        source: 'nba-api',
        category: 'sports'
      };

      await prisma.aIKnowledge.create({
        data
      });
      successCount++;
    }

    console.log(`Successfully stored ${successCount} game results in database`);
    return gameResults;
  } catch (error) {
    console.error('Error updating NBA knowledge:', error);
    throw error;
  }
}

// Update helper function to calculate team record
function calculateTeamRecord(games: { content: string; metadata: string }[], teamName: string): string {
  let wins = 0;
  let losses = 0;
  console.log(`Calculating record for ${teamName} from ${games.length} games`);

  games.forEach(game => {
    // Skip games that haven't started (0-0 score)
    if (game.content.includes('0 @ ') || game.content.includes(' 0 (')) {
      console.log('Skipping unplayed game:', game.content);
      return;
    }

    // Count based on the game result string
    if (game.content.includes('defeated')) {
      if (game.content.includes(`${teamName} defeated`)) {
        wins++;
        console.log(`Win found: ${game.content}`);
      } else {
        losses++;
        console.log(`Loss found: ${game.content}`);
      }
    }
  });

  console.log(`Final record for ${teamName}: ${wins}-${losses}`);
  return `${wins}-${losses}`;
}

export async function getNBAContext(query: string): Promise<string> {
  try {
    console.log('Getting NBA context for query:', query);
    const seasonStart = new Date('2024-10-21');
    console.log('Using season start date:', seasonStart);
    
    // Extract team name from query
    const teamNames = [
      'Nuggets', 'Heat', 'Lakers', 'Warriors', 'Celtics', 'Bulls', 'Kings',
      'Suns', 'Clippers', 'Mavericks', 'Thunder', 'Rockets', 'Spurs', 'Jazz',
      'Grizzlies', 'Pelicans', 'Timberwolves', 'Trail Blazers', 'Nets',
      'Hawks', '76ers', 'Raptors', 'Knicks', 'Cavaliers', 'Pacers',
      'Hornets', 'Magic', 'Pistons', 'Bucks', 'Wizards'
    ];
    const mentionedTeam = teamNames.find(team => 
      query.toLowerCase().includes(team.toLowerCase())
    );
    console.log('Mentioned team:', mentionedTeam);

    // Get games from the season start
    const knowledge = await prisma.aIKnowledge.findMany({
      where: {
        source: 'nba-api',
        category: 'sports',
        type: 'game_result',
        date: {
          gte: seasonStart
        },
        ...(mentionedTeam && {
          OR: [
            { content: { contains: mentionedTeam } },
            { metadata: { contains: mentionedTeam } }
          ]
        })
      },
      orderBy: {
        date: 'desc'
      },
      ...(!mentionedTeam && { take: 10 }) // Only limit to 10 games if no specific team is mentioned
    });

    console.log('Retrieved knowledge entries:', knowledge.length);
    if (knowledge.length > 0) {
      console.log('Sample game data:', {
        date: knowledge[0].date,
        content: knowledge[0].content,
        metadata: knowledge[0].metadata
      });
    }

    if (knowledge.length === 0) {
      console.log('No games found matching criteria');
      return 'No NBA games found for the current season.';
    }

    // Format the knowledge into a readable context
    const context = knowledge.map((k: { date: Date; content: string }) => {
      const date = new Date(k.date).toLocaleDateString('en-US', { 
        timeZone: 'America/New_York',
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      return `[${date}] ${k.content}`;
    }).join('\n');

    let prefix = '';
    if (mentionedTeam) {
      const record = calculateTeamRecord(knowledge, mentionedTeam);
      prefix = `${mentionedTeam} Record: ${record}\nRecent ${mentionedTeam} Games:\n`;
    } else {
      prefix = 'Recent NBA Games:\n';
    }

    const finalContext = `${prefix}${context}`;
    console.log('Returning NBA context:', finalContext);
    return finalContext;
  } catch (error) {
    console.error('Error getting NBA context:', error);
    return 'Error retrieving NBA information.';
  }
} 