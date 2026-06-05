import React, { useState } from 'react';
import { useAdminStore } from '../stores/adminStore';

type GameTypeTab = 'spin-and-go' | 'heads-up';

const TABLE_THEMES = [
  { value: 'classic-green', label: 'Classic Green' },
  { value: 'dark-blue', label: 'Dark Blue' },
  { value: 'red-velvet', label: 'Red Velvet' },
  { value: 'midnight-purple', label: 'Midnight Purple' },
  { value: 'pink-felt', label: 'Pink' },
] as const;

export function GameCreationForm() {
  const { createGame, loading, error, clearError } = useAdminStore();

  const [activeTab, setActiveTab] = useState<GameTypeTab>('spin-and-go');
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [blindIntervalMinutes, setBlindIntervalMinutes] = useState(3);
  const [maxBlindLevel, setMaxBlindLevel] = useState(8);
  const [startingChips, setStartingChips] = useState(500);
  const [tableTheme, setTableTheme] = useState<string>('classic-green');
  const [validationError, setValidationError] = useState<string | null>(null);

  // When switching tabs, update maxPlayers default
  function handleTabChange(tab: GameTypeTab) {
    setActiveTab(tab);
    if (tab === 'heads-up') {
      setMaxPlayers(2);
    } else {
      setMaxPlayers(3);
    }
  }

  function validate(): boolean {
    if (!name.trim()) {
      setValidationError('Game name is required');
      return false;
    }
    if (maxPlayers < 2 || maxPlayers > 10) {
      setValidationError('Player count must be between 2 and 10');
      return false;
    }
    if (blindIntervalMinutes < 1 || blindIntervalMinutes > 30) {
      setValidationError('Blind interval must be between 1 and 30 minutes');
      return false;
    }
    if (maxBlindLevel < 1 || maxBlindLevel > 20) {
      setValidationError('Max blind level must be between 1 and 20');
      return false;
    }
    if (startingChips < 100 || startingChips > 10000) {
      setValidationError('Starting chips must be between 100 and 10,000');
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
      await createGame({
        name: name.trim(),
        maxPlayers,
        blindIntervalMinutes,
        maxBlindLevel,
        startingChips,
        tableTheme: tableTheme as any,
      });
      setName('');
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

      {/* Game type tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleTabChange('spin-and-go')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'spin-and-go'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Spin &amp; Go
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('heads-up')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'heads-up'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Heads Up
        </button>
      </div>

      {displayError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {displayError}
        </div>
      )}

      {/* Game Name */}
      <div className="space-y-1">
        <label htmlFor="game-name" className="block text-sm font-medium text-gray-700">
          Game Name
        </label>
        <input
          id="game-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter game name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Number of Players */}
      <div className="space-y-1">
        <label htmlFor="max-players" className="block text-sm font-medium text-gray-700">
          Number of Players
        </label>
        <select
          id="max-players"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {activeTab === 'heads-up' ? (
            <option value={2}>2 players</option>
          ) : (
            [3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            ))
          )}
        </select>
      </div>

      {/* Blind Interval */}
      <div className="space-y-1">
        <label htmlFor="blind-interval" className="block text-sm font-medium text-gray-700">
          Blind Level Time (minutes)
        </label>
        <select
          id="blind-interval"
          value={blindIntervalMinutes}
          onChange={(e) => setBlindIntervalMinutes(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[1, 2, 3, 5, 7, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'minute' : 'minutes'}
            </option>
          ))}
        </select>
      </div>

      {/* Max Blind Level */}
      <div className="space-y-1">
        <label htmlFor="max-blind-level" className="block text-sm font-medium text-gray-700">
          Maximum Blind Level
        </label>
        <select
          id="max-blind-level"
          value={maxBlindLevel}
          onChange={(e) => setMaxBlindLevel(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[4, 6, 8, 10, 12, 15, 20].map((n) => (
            <option key={n} value={n}>
              Level {n}
            </option>
          ))}
        </select>
      </div>

      {/* Starting Chips */}
      <div className="space-y-1">
        <label htmlFor="starting-chips" className="block text-sm font-medium text-gray-700">
          Starting Chip Stack
        </label>
        <select
          id="starting-chips"
          value={startingChips}
          onChange={(e) => setStartingChips(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[100, 200, 300, 500, 1000, 1500, 2000, 3000, 5000, 10000].map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString()} chips
            </option>
          ))}
        </select>
      </div>

      {/* Table Theme */}
      <div className="space-y-1">
        <label htmlFor="table-theme" className="block text-sm font-medium text-gray-700">
          Table Theme
        </label>
        <select
          id="table-theme"
          value={tableTheme}
          onChange={(e) => setTableTheme(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TABLE_THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Creating...' : `Create ${activeTab === 'heads-up' ? 'Heads Up' : 'Spin & Go'} Game`}
      </button>
    </form>
  );
}
