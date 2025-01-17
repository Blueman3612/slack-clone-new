const API_BASE_URL = 'https://api.balldontlie.io/v1';
const API_KEY = process.env.BALLDONTLIE_API_KEY;

interface APIGame {
  id: number;
  date: string;
  home_team: {
    id: number;
    name: string;
    full_name: string;
    abbreviation: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    name: string;
    full_name: string;
    abbreviation: string;
  };
  visitor_team_score: number;
  status: string;
  period: number;
  time: string;
}

interface APIResponse {
  data: APIGame[];
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number;
    per_page: number;
    total_count: number;
  };
}

export interface TransformedGame {
  id: string;
  date: string;
  home_team: {
    id: number;
    name: string;
    full_name: string;
    abbreviation: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    name: string;
    full_name: string;
    abbreviation: string;
  };
  visitor_team_score: number;
  status: string;
  period: number;
  time: string;
}

async function fetchGamesForDate(startDate: string, endDate: string): Promise<TransformedGame[]> {
  if (!API_KEY) {
    console.error('BALLDONTLIE_API_KEY is not configured');
    throw new Error('BALLDONTLIE_API_KEY is not configured');
  }

  let allGames: APIGame[] = [];
  let currentPage = 1;

  while (true) {
    const url = `${API_BASE_URL}/games?start_date=${startDate}&end_date=${endDate}&per_page=100&page=${currentPage}`;
    console.log(`Requesting page ${currentPage} from URL:`, url);

    const response = await fetch(url, {
      headers: {
        'Authorization': API_KEY,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('balldontlie API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`balldontlie API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || !Array.isArray(data.data)) {
      console.log('Invalid response format');
      break;
    }

    console.log(`Fetched ${data.data.length} games from page ${currentPage}`);
    allGames = [...allGames, ...data.data];

    // Check if we have more pages
    if (!data.meta || !data.meta.next_page) {
      console.log('No more pages available');
      break;
    }

    currentPage = data.meta.next_page;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Total games fetched: ${allGames.length}`);

  return allGames.map((game: APIGame): TransformedGame => ({
    id: `${game.id}`,
    date: convertUTCtoEST(game.date),
    home_team: game.home_team,
    home_team_score: game.home_team_score,
    visitor_team: game.visitor_team,
    visitor_team_score: game.visitor_team_score,
    status: game.status,
    period: game.period,
    time: game.time
  }));
}

// Update the convertUTCtoEST function to handle the date offset correctly
function convertUTCtoEST(utcDate: string): string {
  // Create a date object in UTC
  const date = new Date(utcDate);
  // No need to adjust the date - the API date is already correct
  return date.toISOString().split('T')[0];
}

export async function getRecentGames(): Promise<TransformedGame[]> {
  try {
    const startDate = new Date('2024-10-14');  // Season start date
    const endDate = new Date();  // Current date
    const dateRanges = [];

    // Generate weekly ranges
    let currentStart = startDate;
    while (currentStart < endDate) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6);  // Add 6 days to get a 7-day range
      
      if (currentEnd > endDate) {
        currentEnd = endDate;
      }

      dateRanges.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    let allGames: TransformedGame[] = [];

    for (const range of dateRanges) {
      console.log(`Fetching games from ${range.start} to ${range.end}`);
      const apiGames = await fetchGamesForDate(range.start, range.end);
      allGames = [...allGames, ...apiGames];  // No need to transform again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total games processed: ${allGames.length}`);
    return allGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error in getRecentGames:', error);
    throw error;
  }
}

export function formatGameResult(game: TransformedGame): string {
  const homeTeam = game.home_team.abbreviation;
  const visitorTeam = game.visitor_team.abbreviation;
  const status = game.status === 'Final' 
    ? 'Final'
    : `${game.period}Q ${game.time}`;

  return `${visitorTeam} ${game.visitor_team_score} @ ${homeTeam} ${game.home_team_score} (${status})`;
} 