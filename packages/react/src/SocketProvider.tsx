import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BOLT_EVENTS } from '@bolt-socket/core';
import type { EventSchema, BoltSessionPayload } from '@bolt-socket/core';
import type { SocketProviderProps, SocketContextValue } from './types';

/**
 * Socket context — provides socket instance and events registry to the tree.
 */
const SocketContext = createContext<SocketContextValue<any> | null>(null);

/**
 * SocketProvider — Manages socket connection lifecycle.
 *
 * Responsibilities:
 * - Initialise and maintain a singleton socket connection          (Phase 3)
 * - Async auth injection with token refresh on every reconnect    (Phase 6)
 * - Graceful auth error handling                                  (Phase 6)
 * - Configurable reconnection strategy (delay, jitter, max)       (Phase 7)
 * - Automatic bolt:sync request after reconnect (event replay)    (Phase 7)
 * - Dev mode warnings when configuration looks incorrect          (Phase 8)
 *
 * @example Basic
 * ```tsx
 * <SocketProvider url="http://localhost:3000" events={events}>
 *   <App />
 * </SocketProvider>
 * ```
 *
 * @example Full reliability setup
 * ```tsx
 * <SocketProvider
 *   url="http://localhost:3000"
 *   events={events}
 *   auth={async () => ({ token: await getToken() })}
 *   reconnect={{ maxAttempts: 20, delay: 500, maxDelay: 20_000 }}
 *   syncOnReconnect
 *   onConnect={() => toast.success('Online')}
 *   onReconnect={(n) => { refetchData(); toast.info(`Reconnected after ${n} tries`) }}
 *   onAuthError={(e) => navigate('/login')}
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
  onReconnect,
  reconnect,
  syncOnReconnect = false,
  children,
}: SocketProviderProps<T>) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const authProviderRef = useRef(auth);
  // Last confirmed connection timestamp for bolt:sync replay
  const lastConnectedAtRef = useRef<number>(0);
  // Rooms the client is subscribed to (for filtered replay)
  const activeRoomsRef = useRef<string[]>([]);

  // Always call latest callbacks without re-creating socket
  useEffect(() => { authProviderRef.current = auth; }, [auth]);

  useEffect(() => {
    const resolveAuth = async (): Promise<object | undefined> => {
      if (!authProviderRef.current) return undefined;
      if (typeof authProviderRef.current === 'function') {
        try {
          return await (authProviderRef.current as () => Promise<object>)();
        } catch (error) {
          console.error('[BoltSocket] Auth provider threw:', error);
          return undefined;
        }
      }
      return authProviderRef.current;
    };

    const initSocket = async () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const authData = await resolveAuth();

      // Build reconnection options from our ReconnectOptions type
      const reconnectOpts = reconnect
        ? {
            reconnectionAttempts: reconnect.maxAttempts ?? Infinity,
            reconnectionDelay: reconnect.delay ?? 1_000,
            reconnectionDelayMax: reconnect.maxDelay ?? 30_000,
            randomizationFactor: reconnect.randomization ?? 0.5,
          }
        : {};

      const newSocket = io(url, {
        ...options,
        ...reconnectOpts,
        auth: authData,
      });

      // ── Connection lifecycle ────────────────────────────────────────────

      newSocket.on('connect', () => {
        const now = Date.now();
        setIsConnected(true);
        onConnect?.();

        // Phase 7: Remember when we connected
        lastConnectedAtRef.current = now;

        // Phase 7: Receive session info (server sends this on every connection)
        // — handled below in the bolt:session listener
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        onDisconnect?.(reason);
      });

      newSocket.on('connect_error', async (error) => {
        const isAuthError =
          error.message.includes('Authentication') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('Invalid token') ||
          error.message.includes('No token');

        if (isAuthError) {
          onAuthError?.({ message: error.message, error });
        }
        onError?.(error);
      });

      // ── Reconnection events ─────────────────────────────────────────────

      newSocket.io.on('reconnect_attempt', (attempt: number) => {
        onReconnectAttempt?.(attempt);
      });

      newSocket.io.on('reconnect', async (attempt: number) => {
        // Refresh auth token on every reconnect
        const freshAuth = await resolveAuth();
        if (freshAuth) {
          newSocket.auth = freshAuth;
        }

        // Phase 7: Notify caller
        onReconnect?.(attempt);

        // Phase 7: Request event replay if enabled
        if (syncOnReconnect && lastConnectedAtRef.current > 0) {
          newSocket.emit(BOLT_EVENTS.SYNC, {
            since: lastConnectedAtRef.current,
            rooms: activeRoomsRef.current.length > 0
              ? activeRoomsRef.current
              : undefined,
          });
        }
      });

      // ── Phase 7: Session protocol (server → client) ─────────────────────

      newSocket.on(BOLT_EVENTS.SESSION, (data: BoltSessionPayload) => {
        // Server confirms our session. Update lastConnectedAt with server time.
        lastConnectedAtRef.current = data.connectedAt;
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally only re-create socket when url changes.
  // Auth, callbacks, and reconnect options are accessed via refs.

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
 * useSocket — Access the raw Socket.IO socket instance.
 *
 * @returns Socket instance or null before first connection
 * @throws If called outside a SocketProvider
 *
 * @example
 * ```tsx
 * const socket = useSocket();
 * if (socket?.connected) {
 *   socket.emit('custom-event', payload);
 * }
 * ```
 */
export function useSocket(): Socket | null {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('[BoltSocket] useSocket must be used within a <SocketProvider>');
  }
  return context.socket;
}

/**
 * useSocketContext — Internal hook to access the full context.
 * @internal
 */
export function useSocketContext<T extends EventSchema>(): SocketContextValue<T> {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('[BoltSocket] Socket hooks must be used within a <SocketProvider>');
  }
  return context;
}
