import { useEffect } from 'react';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useSocket } from '../../hooks/useSocket';
import { GameInstanceCard } from './GameInstanceCard';
import { EmptyLobbyMessage } from './EmptyLobbyMessage';

/**
 * Main lobby page displaying available Spin & Go games.
 * Fetches games on mount and subscribes to real-time lobby:update events.
 * Satisfies Requirements 2.1–2.6, 3.1, 3.2, 13.1.
 */
export function LobbyView() {
  const {
    games,
    loading,
    error,
    registering,
    registrationMessage,
    fetchGames,
    registerForGame,
    applyLobbyUpdate,
    clearRegistrationMessage,
  } = useLobbyStore();

  const socket = useSocket();

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Subscribe to real-time lobby updates via WebSocket
  useEffect(() => {
    socket.emit('lobby:subscribe');

    socket.on('lobby:update', applyLobbyUpdate);

    return () => {
      socket.off('lobby:update', applyLobbyUpdate);
      socket.emit('lobby:unsubscribe');
    };
  }, [socket, applyLobbyUpdate]);

  // Auto-dismiss registration message after 3 seconds
  useEffect(() => {
    if (registrationMessage) {
      const timer = setTimeout(clearRegistrationMessage, 3000);
      return () => clearTimeout(timer);
    }
  }, [registrationMessage, clearRegistrationMessage]);

  const handleRegister = async (gameId: string) => {
    try {
      await registerForGame(gameId);
    } catch {
      // Error is handled in the store and shown via registrationMessage
    }
  };

  return (
    <div className="min-h-screen bg-poker-dark px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-poker-gold">
          Spin &amp; Go Lobby
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">
          Choose a game and register to play. Games start when 3 players join.
        </p>
      </header>

      {/* Registration feedback toast */}
      {registrationMessage && (
        <div
          role="alert"
          className="max-w-7xl mx-auto mb-4 px-4 py-3 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm"
        >
          {registrationMessage}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-poker-gold border-t-transparent" role="status">
            <span className="sr-only">Loading games…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="max-w-7xl mx-auto text-center py-16">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchGames}
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-md bg-poker-gold text-poker-dark font-semibold hover:bg-yellow-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && games.length === 0 && <EmptyLobbyMessage />}

      {/* Game grid — responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      {!loading && !error && games.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <GameInstanceCard
              key={game.id}
              game={game}
              onRegister={handleRegister}
              registering={registering}
            />
          ))}
        </div>
      )}
    </div>
  );
}
