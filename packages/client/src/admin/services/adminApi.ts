import { apiFetch } from '../../services/api';
import type {
  GameCreationRequest,
  GameCreationResponse,
  AdminGameListResponse,
  GameInstance,
} from '@spin-and-go/shared';

// ──────────────────────────────────────────────────────────────────
// Admin authentication (separate from player auth)
// ──────────────────────────────────────────────────────────────────

/** Authenticate an admin account */
export async function adminLogin(username: string, password: string): Promise<boolean> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

/** Fetch all player accounts (admin view) */
export async function listPlayers(): Promise<any[]> {
  const res = await fetch('/api/admin/players');
  if (!res.ok) throw new Error('Failed to fetch players');
  const data = await res.json();
  return data.players;
}

// ──────────────────────────────────────────────────────────────────
// Game management (uses player auth via apiFetch)
// ──────────────────────────────────────────────────────────────────

/** Create a new game instance via the admin API */
export async function createGame(
  request: GameCreationRequest,
): Promise<GameInstance> {
  const data = await apiFetch<GameCreationResponse>('/api/admin/games', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return data.game;
}

/** Fetch all game instances (admin view — includes all statuses) */
export async function listGames(): Promise<GameInstance[]> {
  const data = await apiFetch<AdminGameListResponse>('/api/admin/games');
  return data.games;
}

/** Delete a game instance by ID */
export async function deleteGame(gameId: string): Promise<void> {
  await apiFetch<void>(`/api/admin/games/${gameId}`, {
    method: 'DELETE',
  });
}
