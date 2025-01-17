'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface Team {
  id: number;
  name: string;
  full_name: string;
  abbreviation: string;
}

interface Game {
  id: string;
  date: string;
  home_team: Team;
  home_team_score: number;
  visitor_team: Team;
  visitor_team_score: number;
  status: string;
  period: number;
  time: string;
}

function formatDateInEST(dateStr: string) {
  // Parse the YYYY-MM-DD date string
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);  // month is 0-based in Date constructor
  
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export default function NBAPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/nba/stats?type=games', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="p-4">Please sign in to view NBA games.</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">NBA Games</h1>
        <button
          onClick={fetchGames}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Games'}
        </button>
      </div>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      {games.length === 0 && !loading && (
        <div className="text-gray-500">
          Click Refresh Games to load NBA game data.
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">2024-25 Season Games ({games.length})</h2>
        {games.length === 0 && !loading && !error && (
          <p className="text-gray-500">No games found.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {games.map((game) => (
            <div key={game.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-right">
                  <div className="font-bold">{game.visitor_team.full_name}</div>
                  <div className="text-2xl font-bold">{game.visitor_team_score}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">@</div>
                  <div className="text-sm">
                    {formatDateInEST(game.date)}
                  </div>
                  <div className="text-sm font-bold">
                    {game.status.toLowerCase() === 'final' 
                      ? 'Final' 
                      : `${game.period}Q ${game.time}`}
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold">{game.home_team.full_name}</div>
                  <div className="text-2xl font-bold">{game.home_team_score}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 