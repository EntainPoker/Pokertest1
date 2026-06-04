import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { GameInstanceCard } from './GameInstanceCard';
import { EmptyLobbyMessage } from './EmptyLobbyMessage';

export function LobbyView() {
  const navigate = useNavigate();
  const currentPlayerId = useAuthStore((s) => s.player?.id ?? '');
  const balance = useAuthStore((s) => s.player?.balance ?? 0);
  const logout = useAuthStore((s) => s.logout);
  const {
    games,
    loading,
    error,
    registering,
    registrationMessage,
    fetchGames,
    registerForGame,
    unregisterFromGame,
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

    const handleLobbyUpdate = (payload: any) => {
      applyLobbyUpdate(payload);
      // If a game becomes full or in_progress, navigate only if the current player is registered
      if (payload.status === 'full' || payload.status === 'in_progress') {
        const game = games.find(g => g.id === payload.gameId);
        if (game && game.registeredPlayers.includes(currentPlayerId)) {
          navigate(`/table/${payload.gameId}`);
        }
      }
    };

    socket.on('lobby:update', handleLobbyUpdate);

    return () => {
      socket.off('lobby:update', handleLobbyUpdate);
      socket.emit('lobby:unsubscribe');
    };
  }, [socket, applyLobbyUpdate, navigate, games, currentPlayerId]);

  // Auto-dismiss registration message after 3 seconds
  useEffect(() => {
    if (registrationMessage) {
      const timer = setTimeout(clearRegistrationMessage, 3000);
      return () => clearTimeout(timer);
    }
  }, [registrationMessage, clearRegistrationMessage]);

  const handleRegister = async (gameId: string) => {
    try {
      const result = await registerForGame(gameId);
      const game = games.find(g => g.id === gameId);
      if (game && result.playerCount >= game.maxPlayers) {
        setTimeout(() => navigate(`/table/${gameId}`), 1000);
      }
    } catch {
      // Error handled in store
    }
  };

  const handleUnregister = async (gameId: string) => {
    try {
      await unregisterFromGame(gameId);
    } catch {
      // Error handled in store
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-poker-gold via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              Spin &amp; Go
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base tracking-wide">
              Premium poker tournaments — fast, thrilling, rewarding
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Balance pill */}
            <div className="flex items-center gap-2 bg-gray-800/80 border border-poker-gold/30 rounded-full px-5 py-2.5 shadow-lg shadow-poker-gold/5">
              <span className="w-2.5 h-2.5 rounded-full bg-poker-gold animate-pulse" aria-hidden="true" />
              <span className="text-lg font-bold text-poker-gold">${balance.toLocaleString()}</span>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-full text-sm font-medium text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="mt-6 flex gap-1 border-b border-gray-800">
          <button
            type="button"
            className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-poker-gold border-b-2 border-poker-gold bg-transparent"
          >
            Game Lobby
          </button>
          <button
            type="button"
            className="min-h-[44px] px-5 py-2.5 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-300 transition-colors"
          >
            Top Prizes
          </button>
        </div>
      </header>

      {/* Registration feedback toast */}
      {registrationMessage && (
        <div
          role="alert"
          className="max-w-7xl mx-auto mb-4 px-4 py-3 rounded-xl bg-gray-800/90 border border-poker-gold/40 text-gray-200 text-sm backdrop-blur-sm shadow-lg"
        >
          {registrationMessage}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-poker-gold border-t-transparent" role="status">
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
            className="min-h-[44px] min-w-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-poker-gold to-amber-500 text-gray-900 font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-poker-gold/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && games.length === 0 && <EmptyLobbyMessage />}

      {/* Game grid — responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      {!loading && !error && games.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {games.map((game) => (
            <GameInstanceCard
              key={game.id}
              game={game}
              currentPlayerId={currentPlayerId}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
              registering={registering}
            />
          ))}
        </div>
      )}
    </div>
  );
}
