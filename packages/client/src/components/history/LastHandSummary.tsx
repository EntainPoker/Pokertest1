import { useEffect, useState } from 'react';
import type { HandHistory, HandHistoryAction, Card as CardType } from '@spin-and-go/shared';
import { apiFetch } from '../../services/api';
import { Card } from '../shared/Card';

interface LastHandSummaryProps {
  gameId: string;
  onClose: () => void;
}

interface LastHandApiResponse {
  hand: HandHistory | null;
  message?: string;
}

/**
 * Overlay component displaying the most recently completed hand history.
 * Shows actions by betting round, community cards at each stage,
 * final result, pot size, winning hand, and net chips won/lost.
 *
 * Satisfies Requirements 12.1, 12.2, 12.3, 12.4, 12.5.
 */
export function LastHandSummary({ gameId, onClose }: LastHandSummaryProps) {
  const [hand, setHand] = useState<HandHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLastHand() {
      try {
        setLoading(true);
        const data = await apiFetch<LastHandApiResponse>(`/api/history/${gameId}/last-hand`);
        if (!cancelled) {
          setHand(data.hand);
          if (!data.hand && data.message) {
            setError(data.message);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load hand history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLastHand();
    return () => { cancelled = true; };
  }, [gameId]);

  /** Group actions by betting round */
  function groupActionsByRound(actions: HandHistoryAction[]) {
    const rounds: Record<string, HandHistoryAction[]> = {
      preflop: [],
      flop: [],
      turn: [],
      river: [],
    };
    for (const action of actions) {
      if (rounds[action.bettingRound]) {
        rounds[action.bettingRound].push(action);
      }
    }
    return rounds;
  }

  /** Format a player action for display */
  function formatAction(action: HandHistoryAction, players: HandHistory['players']): string {
    const player = players.find(p => p.playerId === action.playerId);
    const name = player?.username ?? 'Unknown';
    const act = action.action;

    switch (act.type) {
      case 'check':
        return `${name} checks`;
      case 'bet':
        return `${name} bets ${act.amount}`;
      case 'call':
        return `${name} calls`;
      case 'raise':
        return `${name} raises to ${act.amount}`;
      case 'fold':
        return `${name} folds`;
      case 'all_in':
        return `${name} goes all-in`;
      default:
        return `${name} acts`;
    }
  }

  /** Get community cards visible at each stage */
  function getCommunityCardsForRound(round: string, communityCards: CardType[]): CardType[] {
    switch (round) {
      case 'flop':
        return communityCards.slice(0, 3);
      case 'turn':
        return communityCards.slice(0, 4);
      case 'river':
        return communityCards.slice(0, 5);
      default:
        return [];
    }
  }

  const roundLabels: Record<string, string> = {
    preflop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Last Hand Summary"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-gray-900 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Last Hand</h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close hand history"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && (error || !hand) && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-base">
                {error || 'No hand history available'}
              </p>
            </div>
          )}

          {!loading && hand && (
            <>
              {/* Hand number and pot */}
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>Hand #{hand.handNumber}</span>
                <span className="font-medium text-yellow-400">
                  Pot: {hand.pots.reduce((sum, p) => sum + p.amount, 0)} chips
                </span>
              </div>

              {/* Result summary */}
              <div className="rounded-lg bg-gray-800 p-3 space-y-2">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Result</h3>
                <ResultDisplay hand={hand} />
              </div>

              {/* Net chips for viewing player */}
              <NetChipsDisplay players={hand.players} />

              {/* Actions by betting round */}
              <div className="space-y-3">
                {Object.entries(groupActionsByRound(hand.actions)).map(([round, actions]) => {
                  if (actions.length === 0) return null;
                  const cardsForRound = getCommunityCardsForRound(round, hand.communityCards);

                  return (
                    <div key={round} className="rounded-lg bg-gray-800 p-3 space-y-2">
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                        {roundLabels[round]}
                      </h3>

                      {/* Community cards at this stage */}
                      {cardsForRound.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {cardsForRound.map((card, i) => (
                            <Card key={`${round}-${i}`} rank={card.rank} suit={card.suit} />
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <ul className="space-y-1">
                        {actions.map((action, i) => (
                          <li key={i} className="text-sm text-gray-300">
                            {formatAction(action, hand.players)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Final community cards */}
              {hand.communityCards.length > 0 && (
                <div className="rounded-lg bg-gray-800 p-3 space-y-2">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Board
                  </h3>
                  <div className="flex gap-1 flex-wrap">
                    {hand.communityCards.map((card, i) => (
                      <Card key={`board-${i}`} rank={card.rank} suit={card.suit} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Displays the hand result: winner, method, and winning hand */
function ResultDisplay({ hand }: { hand: HandHistory }) {
  const winner = hand.players.find(p => p.playerId === hand.result.winnerId);
  const winnerName = winner?.username ?? 'Unknown';

  return (
    <div className="space-y-1">
      <p className="text-white text-sm">
        <span className="font-semibold text-green-400">{winnerName}</span>
        {' wins '}
        {hand.result.method === 'showdown' ? (
          <>
            at showdown
            {hand.result.winningHand && (
              <span className="text-yellow-300"> with {hand.result.winningHand.name}</span>
            )}
          </>
        ) : (
          <>— all others folded</>
        )}
      </p>

      {/* Show winning hand cards if showdown */}
      {hand.result.method === 'showdown' && hand.result.winningHand?.cards && (
        <div className="flex gap-1 flex-wrap mt-1">
          {hand.result.winningHand.cards.map((card, i) => (
            <Card key={`winning-${i}`} rank={card.rank} suit={card.suit} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Displays net chips won/lost by the viewing player */
function NetChipsDisplay({ players }: { players: HandHistory['players'] }) {
  // We show all players' net chip changes since we don't have the viewing player ID here
  // In a real scenario, you'd filter to the current user
  const playersWithChanges = players.filter(p => p.netChipChange !== 0);

  if (playersWithChanges.length === 0) return null;

  return (
    <div className="rounded-lg bg-gray-800 p-3 space-y-2">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Chip Changes</h3>
      <ul className="space-y-1">
        {players.map((player) => (
          <li key={player.playerId} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{player.username}</span>
            <span className={player.netChipChange >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
              {player.netChipChange >= 0 ? '+' : ''}{player.netChipChange}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
