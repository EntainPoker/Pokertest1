import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket, type AppSocket } from '../services/socket';

/**
 * Hook for managing the WebSocket connection lifecycle.
 * Connects on mount and disconnects on unmount.
 * Returns the socket instance for event subscription.
 */
export function useSocket(): AppSocket {
  const socketRef = useRef<AppSocket>(getSocket());

  useEffect(() => {
    connectSocket();
    const socket = socketRef.current;

    return () => {
      disconnectSocket();
    };
  }, []);

  return socketRef.current;
}
