import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@spin-and-go/shared';
import { getStoredTokens } from './api';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Get or create the Socket.IO client connection.
 * Authenticates using the stored access token.
 */
export function getSocket(): AppSocket {
  if (socket) return socket;

  const tokens = getStoredTokens();

  socket = io(window.location.origin, {
    auth: {
      token: tokens?.accessToken ?? '',
    },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  return socket;
}

/**
 * Connect the socket if not already connected.
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    // Update auth token before connecting
    const tokens = getStoredTokens();
    s.auth = { token: tokens?.accessToken ?? '' };
    s.connect();
  }
}

/**
 * Disconnect and destroy the socket instance.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
