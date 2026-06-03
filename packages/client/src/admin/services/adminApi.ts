import { apiFetch } from '../../services/api';
import type {
  GameCreationRequest,
  GameCreationResponse,
  AdminGameListResponse,
  GameInstance,
} from '@spin-and-go/shared';

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
