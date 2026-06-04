import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { PokerTable } from '../components/table/PokerTable';
import { TournamentLobby } from '../components/tournament/TournamentLobby';
import { BlindTimer } from '../components/table/BlindTimer';
import { useGameStore } from '../stores/gameStore';
import { apiFetch } from '../services/api';

/**
 * Game page — wraps PokerTable with game state management (useGameState hook),
 * tournament lobby button, and handles game:end navigation back to lobby.
 *
 * Key behaviors:
 * - Subscribes to game events via useGameState
 * - Shows tournament lobby overlay on button click
 * - On game:end → shows results briefly, then navigates to /lobby
 * - WebSocket reconnection triggers state resync
 */
export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { player } = useAuth();
  const socket = useSocket();

  // Subscribe to game events
  const {
    handState,
    tournament,
    gameStatus,
    tournamentResult,
    turnTimeRemaining,
  } = useGameState();

  const [showTournamentLobby, setShowTournamentLobby] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const currentPlayerId = player?.id ?? '';

  // Handle game:end — show results then navigate to lobby
  useEffect(() => {
    if (gameStatus === 'ended' && tournamentResult) {
      setShowResults(true);

      // Navigate back to lobby after showing results for 5 seconds
      const timer = setTimeout(() => {
        useGameStore.getState().reset();
        navigate('/lobby');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [gameStatus, tournamentResult, navigate]);

  // Handle WebSocket reconnection — request state resync
  useEffect(() => {
    const handleReconnect = () => {
      if (gameId) {
        socket.emit('game:join', { gameId, playerId: currentPlayerId });
      }
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, gameId, currentPlayerId]);

  // Join the game room on mount
  useEffect(() => {
    if (gameId && currentPlayerId) {
      const joinGame = () => {
        socket.emit('game:join', { gameId, playerId: currentPlayerId });
      };

      if (socket.connected) {
        joinGame();
      } else {
        socket.once('connect', joinGame);
      }

      return () => {
        socket.off('connect', joinGame);
      };
    }
  }, [socket, gameId, currentPlayerId]);

  // REST fallback — poll for game state if WebSocket doesn't deliver within 3 seconds
  useEffect(() => {
    if (!gameId || handState) return;

    const pollInterval = setInterval(async () => {
      try {
        const data = await apiFetch<{ state: any }>(`/api/game/${gameId}/state`);
        if (data.state && !useGameStore.getState().handState) {
          const { handState: hs, tournament: t } = data.state;
          useGameStore.setState({
            handState: hs,
            tournament: t,
            gameStatus: 'playing',
            myHoleCards: hs.players.find((p: any) => p.playerId === currentPlayerId)?.holeCards ?? [],
            isMyTurn: hs.players[hs.currentPlayerIndex]?.playerId === currentPlayerId,
            turnTimeRemaining: hs.turnTimeoutSeconds,
          });
        }
      } catch {
        // Game state not ready yet, keep polling
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [gameId, handState, currentPlayerId]);

  const handleBackToLobby = useCallback(() => {
    useGameStore.getState().reset();
    navigate('/lobby');
  }, [navigate]);

  // Show results overlay when game ends
  if (showResults && tournamentResult) {
    const myResult = tournamentResult.standings?.find(
      (p) => p.playerId === currentPlayerId,
    );
    const isWinner = tournamentResult.winnerId === currentPlayerId;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            Tournament Complete
          </h2>

          {isWinner ? (
            <div className="mb-6">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-xl font-bold text-poker-gold">You Won!</p>
              <p className="text-gray-300 mt-2">
                Prize: ${tournamentResult.prizePool}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-xl text-gray-300">
                You finished in position{' '}
                <span className="font-bold text-white">
                  #{myResult?.position ?? '?'}
                </span>
              </p>
            </div>
          )}

          <p className="text-sm text-gray-400 mb-4">
            Returning to lobby in a few seconds...
          </p>

          <button
            type="button"
            onClick={handleBackToLobby}
            className="min-h-[44px] px-6 py-3 rounded-md bg-poker-gold text-gray-900 font-semibold hover:bg-yellow-400 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Waiting state — game hasn't started yet
  if (!handState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-poker-gold border-t-transparent mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Waiting for game to start...</p>
          <button
            type="button"
            onClick={handleBackToLobby}
            className="mt-4 min-h-[44px] px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Game header */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToLobby}
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            ← Lobby
          </button>

          <div className="flex items-center gap-3">
            {/* Blind timer */}
            {tournament && (
              <BlindTimer
                currentLevel={tournament.blindSchedule[tournament.currentBlindLevel - 1] ?? tournament.blindSchedule[0]}
                nextLevel={tournament.blindSchedule[tournament.currentBlindLevel] ?? null}
                timeRemaining={turnTimeRemaining}
              />
            )}

            {/* Tournament lobby button */}
            {tournament && (
              <button
                type="button"
                onClick={() => setShowTournamentLobby(true)}
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-sm font-medium text-poker-gold border border-poker-gold/50 hover:bg-poker-gold/10 transition-colors"
                aria-label="Open tournament lobby"
              >
                Tournament
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Poker table */}
      <main className="flex-1 flex items-center justify-center p-4">
        <PokerTable
          handState={handState}
          currentPlayerId={currentPlayerId}
          gameId={gameId}
          turnTimeRemaining={turnTimeRemaining}
        />
      </main>

      {/* Tournament lobby overlay */}
      {showTournamentLobby && tournament && (
        <TournamentLobby
          tournament={tournament}
          timeRemaining={turnTimeRemaining}
          onClose={() => setShowTournamentLobby(false)}
        />
      )}
    </div>
  );
}
