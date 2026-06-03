import React, { useState } from 'react';
import { useAdminStore } from '../stores/adminStore';

export function GameCreationForm() {
  const { createGame, loading, error, clearError } = useAdminStore();

  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(): boolean {
    if (!name.trim()) {
      setValidationError('Game name is required');
      return false;
    }
    if (maxPlayers < 2 || maxPlayers > 6) {
      setValidationError('Player count must be between 2 and 6');
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    try {
      await createGame({ name: name.trim(), maxPlayers });
      setName('');
      setMaxPlayers(3);
      setValidationError(null);
    } catch {
      // Server error is surfaced via the store's error state
    }
  }

  const displayError = validationError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Create Game Instance</h2>

      {displayError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {displayError}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="game-name"
          className="block text-sm font-medium text-gray-700"
        >
          Game Name
        </label>
        <input
          id="game-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter game name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="max-players"
          className="block text-sm font-medium text-gray-700"
        >
          Player Count
        </label>
        <select
          id="max-players"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} players
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Game'}
      </button>
    </form>
  );
}
