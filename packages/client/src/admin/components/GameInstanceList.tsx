import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../stores/adminStore';
import type { GameInstance } from '@spin-and-go/shared';

interface GameInstanceListProps {
  onSelect?: (game: GameInstance) => void;
}

type GameFilter = 'all' | 'spin-and-go' | 'heads-up' | 'tourney';

export function GameInstanceList({ onSelect }: GameInstanceListProps) {
  const { games, loading, error, fetchGames, deleteGame } = useAdminStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GameFilter>('all');

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  function handleDelete(gameId: string) {
    if (confirmDeleteId === gameId) {
      deleteGame(gameId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(gameId);
    }
  }

  function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function statusBadge(status: GameInstance['status']) {
    const styles: Record<GameInstance['status'], string> = {
      open: 'bg-green-100 text-green-800',
      full: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<GameInstance['status'], string> = {
      open: 'Open',
      full: 'Full',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  }

  // Filter games by type
  const filteredGames = games.filter(game => {
    if (filter === 'heads-up') return game.maxPlayers === 2;
    if (filter === 'spin-and-go') return game.maxPlayers >= 3;
    return true; // 'all'
  });

  // Sort: in_progress first, then by end date (nearest first)
  const sortedGames = [...filteredGames].sort((a, b) => {
    // Status priority: in_progress > full > open > completed
    const statusOrder: Record<GameInstance['status'], number> = {
      in_progress: 0,
      full: 1,
      open: 2,
      completed: 3,
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Within same status, sort by end date (nearest first)
    const dateA = new Date(a.endDate).getTime();
    const dateB = new Date(b.endDate).getTime();
    return dateA - dateB;
  });

  if (loading && games.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading games...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('spin-and-go')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            filter === 'spin-and-go'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Spin &amp; Go
        </button>
        <button
          type="button"
          onClick={() => setFilter('heads-up')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            filter === 'heads-up'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Heads Up
        </button>
      </div>

      {sortedGames.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No games found for this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Players
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  End Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedGames.map((game) => (
                <tr
                  key={game.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelect?.(game)}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {game.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {statusBadge(game.status)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {game.registeredPlayers.length}/{game.maxPlayers}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDate(game.endDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(game.id);
                      }}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        confirmDeleteId === game.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {confirmDeleteId === game.id ? 'Confirm' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
