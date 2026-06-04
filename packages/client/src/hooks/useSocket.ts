import { useEffect, useRef } from 'react';
import { connectSocket, getSocket, type AppSocket } from '../services/socket';

/**
 * Hook for managing the WebSocket connection lifecycle.
 * Connects on mount. Does NOT disconnect on unmount — socket persists
 * across page navigations so game state isn't lost during route changes.
 * Returns the socket instance for event subscription.
 */
export function useSocket(): AppSocket {
  const socketRef = useRef<AppSocket>(getSocket());

  useEffect(() => {
    connectSocket();
  }, []);

  return socketRef.current;
}
