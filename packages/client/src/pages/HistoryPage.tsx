import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';

interface HandHistoryEntry {
  handId: string;
  handNumber: number;
  playedAt: string;
  result: 'win' | 'loss';
  netChipChange: number;
  winningHand: string | null;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [hands, setHands] = useState<HandHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<{ hands: HandHistoryEntry[] }>('/api/history/player');
        setHands(data.hands);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch hand history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Header */}
      <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Back to lobby"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Hand History</h1>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-poker-gold border-t-transparent" role="status">
              <span className="sr-only">Loading hand history…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-poker-gold to-amber-500 text-gray-900 font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-poker-gold/20"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hands.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/60 border border-gray-700 mb-6">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">No Hands Played Yet</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Your completed hand history will appear here after you play your first game.
            </p>
          </div>
        )}

        {/* Hand list */}
        {!loading && !error && hands.length > 0 && (
          <div className="space-y-3">
            {hands.map((hand) => (
              <div
                key={hand.handId}
                className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Result indicator */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        hand.result === 'win' ? 'bg-green-400' : 'bg-red-400'
                      }`}
                    />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Hand #{hand.handNumber}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(hand.playedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        hand.result === 'win' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {hand.netChipChange >= 0 ? '+' : ''}
                      {hand.netChipChange.toLocaleString()} chips
                    </span>
                    {hand.winningHand && (
                      <p className="text-xs text-poker-gold mt-0.5">{hand.winningHand}</p>
                    )}
                    <p
                      className={`text-xs font-medium mt-0.5 ${
                        hand.result === 'win' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {hand.result === 'win' ? 'Won' : 'Lost'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
