import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCreationForm } from '../admin/components/GameCreationForm';
import { GameInstanceList } from '../admin/components/GameInstanceList';
import { GameInstanceDetails } from '../admin/components/GameInstanceDetails';
import { listPlayers } from '../admin/services/adminApi';
import type { GameInstance } from '@spin-and-go/shared';

interface PlayerAccount {
  id: string;
  username: string;
  balance: number;
  is_test_account: number;
  created_at: string;
  last_login_at: string | null;
}

/**
 * Admin page — wraps back office components (GameCreationForm, GameInstanceList,
 * GameInstanceDetails) with a header and navigation.
 * Uses its own admin auth (localStorage 'adminLoggedIn') — NOT the player AuthGuard.
 */
export function AdminPage() {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameInstance | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'players'>('games');
  const [players, setPlayers] = useState<PlayerAccount[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  // Admin auth check — redirect to /admin/login if not authenticated
  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem('adminLoggedIn');
    if (isAdminLoggedIn !== 'true') {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch players when the Players tab is active
  useEffect(() => {
    if (activeTab === 'players') {
      setPlayersLoading(true);
      listPlayers()
        .then((data) => setPlayers(data))
        .catch(() => setPlayers([]))
        .finally(() => setPlayersLoading(false));
    }
  }, [activeTab]);

  const handleSignOut = () => {
    localStorage.removeItem('adminLoggedIn');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-gray-900">
              Back Office
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/lobby')}
              className="min-h-[44px] px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Player Lobby
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[44px] px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Tab navigation */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'games'
                ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Games
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'players'
                ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Players
          </button>
        </div>
      </div>

      {/* Admin content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'games' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: Create game form */}
            <div className="lg:col-span-1">
              <GameCreationForm />
            </div>

            {/* Right column: Game list and details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Game Instances
                  </h2>
                </div>
                <GameInstanceList onSelect={setSelectedGame} />
              </div>

              {selectedGame && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Game Details
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSelectedGame(null)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600"
                      aria-label="Close details"
                    >
                      ✕
                    </button>
                  </div>
                  <GameInstanceDetails game={selectedGame} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Player Accounts
              </h2>
            </div>
            {playersLoading ? (
              <div className="p-6 text-center text-gray-500">Loading players...</div>
            ) : players.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No player accounts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700">Username</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Balance</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Test Account</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{player.username}</td>
                        <td className="px-4 py-3 text-gray-600">{player.balance}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            player.is_test_account
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {player.is_test_account ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {player.created_at ? new Date(player.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {player.last_login_at ? new Date(player.last_login_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
