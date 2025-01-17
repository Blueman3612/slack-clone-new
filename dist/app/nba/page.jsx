"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NBAPage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
function NBAPage() {
    const [games, setGames] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const { data: session, status } = (0, react_2.useSession)();
    const fetchGames = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching NBA games...');
            const response = await fetch('/api/nba/stats?type=games&days=3');
            console.log('Response status:', response.status);
            const contentType = response.headers.get('content-type');
            console.log('Content type:', contentType);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('Error response:', errorData);
                throw new Error((errorData === null || errorData === void 0 ? void 0 : errorData.error) || `Failed to fetch games (${response.status})`);
            }
            const data = await response.json();
            console.log('Fetched games:', data);
            setGames(data);
        }
        catch (error) {
            console.error('Detailed error in fetchGames:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch games');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (status === 'authenticated') {
            fetchGames();
        }
    }, [status]);
    if (status === 'loading') {
        return (<div className="p-8 text-black dark:text-white">
        <h1 className="text-2xl font-bold mb-4">NBA Stats</h1>
        <p>Loading...</p>
      </div>);
    }
    if (status === 'unauthenticated') {
        return (<div className="p-8 text-black dark:text-white">
        <h1 className="text-2xl font-bold mb-4">NBA Stats</h1>
        <p>Please sign in to view NBA statistics.</p>
      </div>);
    }
    return (<div className="p-8 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">NBA Stats</h1>
      
      <div className="mb-4">
        <button onClick={fetchGames} disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
          {loading ? 'Loading...' : 'Refresh Games'}
        </button>
      </div>

      {error && (<div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded">
          {error}
        </div>)}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Recent Games ({games.length})</h2>
        {games.length === 0 && !loading && !error && (<p className="text-gray-500">No games found for the selected period.</p>)}
        {games.map((game) => (<div key={game.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-right">
                <div className="font-bold">{game.visitor_team.full_name}</div>
                <div className="text-2xl font-bold">{game.visitor_team_score}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">@</div>
                <div className="text-sm">
                  {new Date(game.date).toLocaleDateString()}
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
          </div>))}
      </div>
    </div>);
}
