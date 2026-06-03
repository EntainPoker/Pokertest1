import type { TournamentPlayer } from '@spin-and-go/shared';

interface PlayerStandingsProps {
  players: TournamentPlayer[];
}

/**
 * Player standings list showing each player's username, chip count (if active)
 * or finishing position (if eliminated), and status indicator.
 * Sorted: active players first (by chips descending), then eliminated (by position).
 *
 * Satisfies Requirements 11.3, 11.6.
 */
export function PlayerStandings({ players }: PlayerStandingsProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Active players first
    if (a.status === 'active' && b.status === 'eliminated') return -1;
    if (a.status === 'eliminated' && b.status === 'active') return 1;

    // Among active players, sort by chips descending
    if (a.status === 'active' && b.status === 'active') {
      return b.chipCount - a.chipCount;
    }

    // Among eliminated players, sort by position ascending (2nd before 3rd)
    if (a.status === 'eliminated' && b.status === 'eliminated') {
      return (a.finishPosition ?? 99) - (b.finishPosition ?? 99);
    }

    return 0;
  });

  const getPositionLabel = (position: number | null): string => {
    if (position === 2) return '2nd';
    if (position === 3) return '3rd';
    return `${position}th`;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Player Standings
      </h3>
      <ul className="space-y-1" aria-label="Player standings">
        {sortedPlayers.map((player) => (
          <li
            key={player.playerId}
            className={`flex items-center justify-between px-3 py-2 rounded-md ${
              player.status === 'active'
                ? 'bg-poker-green/20 border border-poker-green/40'
                : 'bg-gray-800/50 border border-gray-700/40'
            }`}
          >
            {/* Username */}
            <span className="text-sm font-medium text-gray-100 truncate max-w-[120px]">
              {player.username}
            </span>

            {/* Status + chip count or position */}
            <div className="flex items-center gap-2">
              {player.status === 'active' ? (
                <>
                  <span className="text-xs text-poker-gold font-medium">
                    {player.chipCount} chips
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-600/30 text-green-300 border border-green-500/40">
                    Active
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-400 font-medium">
                    {getPositionLabel(player.finishPosition)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/30 text-red-300 border border-red-500/40">
                    Eliminated
                  </span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
