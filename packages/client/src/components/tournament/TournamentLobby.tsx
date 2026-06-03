import { useEffect, useState } from 'react';
import type { Tournament } from '@spin-and-go/shared';
import { PlayerStandings } from './PlayerStandings';

interface TournamentLobbyProps {
  tournament: Tournament;
  timeRemaining: number;
  onClose: () => void;
}

/**
 * Tournament lobby overlay displaying blind info, player standings,
 * prize pool, and tournament timing. Opens over the poker table
 * without interrupting gameplay.
 *
 * Satisfies Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7.
 */
export function TournamentLobby({ tournament, timeRemaining, onClose }: TournamentLobbyProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    Math.floor((Date.now() - new Date(tournament.startedAt).getTime()) / 1000)
  );

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - new Date(tournament.startedAt).getTime()) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [tournament.startedAt]);

  const currentBlind = tournament.blindSchedule[tournament.currentBlindLevel - 1] ?? null;
  const nextBlind = tournament.blindSchedule[tournament.currentBlindLevel] ?? null;

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStartTime = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Overlay panel */}
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-poker-dark border border-gray-700 shadow-2xl"
        role="dialog"
        aria-label="Tournament Lobby"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-poker-dark border-b border-gray-700 rounded-t-xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-100">
            Tournament Lobby
          </h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 transition-colors"
            aria-label="Close tournament lobby"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Blind Info Section */}
          <section aria-label="Blind information">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
              Blinds
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Current blind level */}
              <div className="p-3 rounded-lg bg-poker-green/20 border border-poker-green/40">
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase">Current Level</p>
                <p className="text-sm sm:text-base font-bold text-gray-100">
                  Level {currentBlind?.level ?? '-'}
                </p>
                <p className="text-xs sm:text-sm text-poker-gold">
                  {currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : '-'}
                </p>
              </div>

              {/* Next blind level */}
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/40">
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase">Next Level</p>
                <p className="text-sm sm:text-base font-bold text-gray-100">
                  {nextBlind ? `Level ${nextBlind.level}` : 'Final'}
                </p>
                <p className="text-xs sm:text-sm text-gray-300">
                  {nextBlind ? `${nextBlind.smallBlind}/${nextBlind.bigBlind}` : '-'}
                </p>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="mt-3 flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-poker-gold" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono text-gray-100">
                {nextBlind ? formatCountdown(timeRemaining) : 'Max level'}
              </span>
              <span className="text-xs text-gray-400">until next level</span>
            </div>
          </section>

          {/* Player Standings Section */}
          <section aria-label="Player standings">
            <PlayerStandings players={tournament.players} />
          </section>

          {/* Prize Pool Section */}
          <section aria-label="Prize pool">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
              Prize Pool
            </h3>
            <div className="p-3 rounded-lg bg-poker-gold/10 border border-poker-gold/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Prize Pool</span>
                <span className="text-base sm:text-lg font-bold text-poker-gold">
                  ${tournament.prizePool}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">Payout Structure</span>
                <span className="text-xs sm:text-sm text-gray-200 font-medium">
                  Winner takes all
                </span>
              </div>
            </div>
          </section>

          {/* Tournament Timing Section */}
          <section aria-label="Tournament timing">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
              Timing
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/40">
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase">Start Time</p>
                <p className="text-sm font-medium text-gray-100">
                  {formatStartTime(tournament.startedAt)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/40">
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase">Elapsed</p>
                <p className="text-sm font-mono font-medium text-gray-100">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
