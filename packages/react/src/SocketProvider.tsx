import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { EventSchema } from '@bolt-socket/core';
import type {
  SocketProviderProps,
  SocketContextValue,
} from './types';

/**
 * Socket context - provides socket instance and events registry
 */
const SocketContext = createContext<SocketContextValue<any> | null>(null);

/**
 * SocketProvider - Manages socket connection lifecycle
 * 
 * Responsibilities:
 * - Initialize socket connection
 * - Handle connect/disconnect events
 * - Inject authentication with automatic refresh on reconnect
 * - Maintain singleton socket instance
 * - Provide socket to children via context
 * - Handle auth failures gracefully
 * 
 * @example Basic
 * ```tsx
 * <SocketProvider 
 *   url="http://localhost:3000"
 *   events={events}
 *   auth={{ token: 'abc123' }}
 * >
 *   <App />
 * </SocketProvider>
 * ```
 * 
 * @example With auth refresh and callbacks
 * ```tsx
 * <SocketProvider 
 *   url="http://localhost:3000"
 *   events={events}
 *   auth={async () => ({ token: await getToken() })}
 *   onConnect={() => console.log('Connected')}
 *   onAuthError={(error) => navigate('/login')}
 * >
 *   <App />
 * </SocketProvider>
 * ```
 */
export function SocketProvider<T extends EventSchema>({
  url,
  events,
  auth,
  options = {},
  onConnect,
  onDisconnect,
  onAuthError,
  onError,
  onReconnectAttempt,
  children,
}: SocketProviderProps<T>) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const authProviderRef = useRef(auth);

  // Keep auth provider ref updated
  useEffect(() => {
    authProviderRef.current = auth;
  }, [auth]);

  useEffect(() => {
    // Resolve auth data - called on initial connect and every reconnect
    const resolveAuth = async (): Promise<object | undefined> => {
      if (!authProviderRef.current) return undefined;
      
      if (typeof authProviderRef.current === 'function') {
        try {
          return await authProviderRef.current();
        } catch (error) {
          console.error('[BoltSocket] Auth provider error:', error);
          // If auth provider fails, still attempt connection without auth
          return undefined;
        }
      }
      
      return authProviderRef.current;
    };

    // Initialize socket connection
    const initSocket = async () => {
      // Cleanup existing connection
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Get auth data
      const authData = await resolveAuth();

      // Create new socket instance
      const newSocket = io(url, {
        ...options,
        auth: authData,
      });

      // Connection lifecycle handlers
      newSocket.on('connect', () => {
        console.log('[BoltSocket] Connected to server');
        setIsConnected(true);
        onConnect?.();
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[BoltSocket] Disconnected:', reason);
        setIsConnected(false);
        onDisconnect?.(reason);
      });

      newSocket.on('connect_error', async (error) => {
        console.error('[BoltSocket] Connection error:', error.message);
        
        // Check if it's an auth error
        if (error.message.includes('Authentication') || 
            error.message.includes('Unauthorized') ||
            error.message.includes('Invalid token')) {
          onAuthError?.({
            message: error.message,
            error,
          });
        }
        
        onError?.(error);
      });

      // Handle reconnection attempts
      newSocket.io.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[BoltSocket] Reconnection attempt ${attemptNumber}`);
        onReconnectAttempt?.(attemptNumber);
      });

      // Refresh auth on reconnect
      newSocket.io.on('reconnect', async () => {
        console.log('[BoltSocket] Reconnected - refreshing auth');
        
        // Get fresh auth data
        const freshAuth = await resolveAuth();
        
        // Update socket auth
        if (freshAuth && newSocket.auth) {
          newSocket.auth = freshAuth;
        }
      });

      // Store socket reference
      socketRef.current = newSocket;
      setSocket(newSocket);
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('[BoltSocket] Cleaning up connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url, options, onConnect, onDisconnect, onAuthError, onError, onReconnectAttempt]); // Reconnect if url or options change

  const contextValue: SocketContextValue<T> = {
    socket,
    events,
    isConnected,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * useSocket - Access the raw socket instance
 * 
 * @returns Socket instance or null if not connected
 * @throws Error if used outside SocketProvider
 * 
 * @example
 * ```tsx
 * const socket = useSocket();
 * if (socket) {
 *   console.log('Socket ID:', socket.id);
 * }
 * ```
 */
export function useSocket(): Socket | null {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context.socket;
}

/**
 * useSocketContext - Access the full socket context
 * 
 * @returns Socket context value
 * @throws Error if used outside SocketProvider
 * 
 * @internal
 */
export function useSocketContext<T extends EventSchema>(): SocketContextValue<T> {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  
  return context;
}
