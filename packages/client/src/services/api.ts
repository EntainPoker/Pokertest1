import type { TokenPair } from '@spin-and-go/shared';

const TOKEN_STORAGE_KEY = 'spin-and-go-tokens';

/** Retrieve stored tokens from localStorage */
export function getStoredTokens(): TokenPair | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TokenPair;
  } catch {
    return null;
  }
}

/** Persist tokens to localStorage */
export function setStoredTokens(tokens: TokenPair): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/** Remove tokens from localStorage */
export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Whether a token refresh is currently in progress (prevents concurrent refreshes) */
let refreshPromise: Promise<TokenPair | null> | null = null;

/** Attempt to refresh the access token using the stored refresh token */
async function refreshAccessToken(): Promise<TokenPair | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!res.ok) {
      clearStoredTokens();
      return null;
    }

    const data = await res.json();
    const newTokens: TokenPair = data.tokens;
    setStoredTokens(newTokens);
    return newTokens;
  } catch {
    clearStoredTokens();
    return null;
  }
}

/**
 * Base fetch wrapper with automatic token attachment and refresh on 401.
 * All API calls should go through this function.
 */
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const tokens = getStoredTokens();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });

  // If 401, attempt token refresh and retry once
  if (res.status === 401 && tokens?.refreshToken) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newTokens = await refreshPromise;
    refreshPromise = null;

    if (newTokens) {
      headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({
      error: 'Unknown',
      message: 'An unexpected error occurred',
      statusCode: res.status,
    }));
    throw errorBody;
  }

  return res.json() as Promise<T>;
}
