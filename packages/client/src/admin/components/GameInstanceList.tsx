import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../stores/adminStore';
import type { GameInstance } from '@spin-and-go/shared';

interface GameInstanceListProps {
  onSelect?: (game: GameInstance) => void;
}

export function GameInstanceList({ onSelect }: GameInstanceListProps) {
  const { games, loading, error, fetchGames, deleteGame } = useAdminStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  if (games.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No game instances found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
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
          {games.map((game) => (
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
  );
}
