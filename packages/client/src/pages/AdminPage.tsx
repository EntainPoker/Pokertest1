import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCreationForm } from '../admin/components/GameCreationForm';
import { GameInstanceList } from '../admin/components/GameInstanceList';
import { GameInstanceDetails } from '../admin/components/GameInstanceDetails';
import { useAuth } from '../hooks/useAuth';
import { disconnectSocket } from '../services/socket';
import type { GameInstance } from '@spin-and-go/shared';

/**
 * Admin page — wraps back office components (GameCreationForm, GameInstanceList,
 * GameInstanceDetails) with a header and navigation.
 */
export function AdminPage() {
  const navigate = useNavigate();
  const { player, logout } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameInstance | null>(null);

  const handleSignOut = async () => {
    await logout();
    disconnectSocket();
    navigate('/login');
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
            {player && (
              <span className="text-sm text-gray-500">
                {player.username}
              </span>
            )}
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

      {/* Admin content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
