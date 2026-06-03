import React from 'react';
import type { GameInstance } from '@spin-and-go/shared';

interface GameInstanceDetailsProps {
  game: GameInstance;
  onClose?: () => void;
}

export function GameInstanceDetails({ game, onClose }: GameInstanceDetailsProps) {
  function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function statusLabel(status: GameInstance['status']): string {
    const labels: Record<GameInstance['status'], string> = {
      open: 'Open',
      full: 'Full',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status];
  }

  return (
    <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{game.name}</h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close details"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">ID</dt>
          <dd className="mt-1 break-all text-sm text-gray-900">{game.id}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Status</dt>
          <dd className="mt-1 text-sm text-gray-900">{statusLabel(game.status)}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Format</dt>
          <dd className="mt-1 text-sm text-gray-900">Texas Hold&apos;em</dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Max Players
          </dt>
          <dd className="mt-1 text-sm text-gray-900">{game.maxPlayers}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Registered Players
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {game.registeredPlayers.length} / {game.maxPlayers}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Buy-In</dt>
          <dd className="mt-1 text-sm text-gray-900">${game.buyIn}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Starting Chips
          </dt>
          <dd className="mt-1 text-sm text-gray-900">{game.startingChips}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Blind Interval
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {game.blindIntervalMinutes} min
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Created At
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {formatDate(game.createdAt)}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">End Date</dt>
          <dd className="mt-1 text-sm text-gray-900">{formatDate(game.endDate)}</dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase text-gray-500">
            Created By
          </dt>
          <dd className="mt-1 break-all text-sm text-gray-900">
            {game.createdBy}
          </dd>
        </div>
      </dl>
    </div>
  );
}
