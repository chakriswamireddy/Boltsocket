import { useEffect, useRef, useState } from 'react';
import { BOLT_EVENTS } from '@bolt-socket/core';
import type { EventReplayEntry } from '@bolt-socket/core';
import { useSocketContext } from './SocketProvider';

/**
 * Snapshot of the current connection state, updated in real time.
 */
export interface ConnectionStatus {
  /** Whether the socket is currently connected to the server. */
  isConnected: boolean;
  /**
   * Number of successful reconnections since the provider mounted.
   * Starts at 0; increments each time connection is restored after a drop.
   */
  reconnectCount: number;
  /**
   * Timestamp of the most recent successful connection.
   * null before the first connect event.
   */
  lastConnectedAt: Date | null;
  /**
   * Timestamp of the most recent disconnect.
   * null before the first disconnect event.
   */
  lastDisconnectedAt: Date | null;
}

/**
 * useReconnect — Run a callback every time the socket reconnects.
 *
 * The callback fires after the socket manager has successfully re-established
 * the connection (i.e. `manager.on('reconnect', ...)`). Use it to re-fetch
 * critical data, re-subscribe to backend resources, or show "Back online" UX.
 *
 * The callback is stable-ref'd via useRef, so it always sees the latest
 * closure values without needing to appear in the dependency array.
 *
 * @param callback - Called with the reconnect attempt number each time the
 *                   socket successfully reconnects.
 *
 * @example
 * ```tsx
 * useReconnect((attempt) => {
 *   console.log(`Reconnected after attempt ${attempt}`);
 *   refetchOrders();
 *   toast.success('Connection restored');
 * });
 * ```
 *
 * @example With missed events via replay
 * ```tsx
 * useReconnect(() => {
 *   // Manually request missed events from your backend
 *   refetchCriticalData();
 * });
 * ```
 */
export function useReconnect(callback: (attempt: number) => void): void {
  const { socket } = useSocketContext();
  const callbackRef = useRef(callback);

  // Always call the latest callback without re-subscribing
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket) return;

    const handleReconnect = (attempt: number) => {
      callbackRef.current(attempt);
    };

    // socket.io is the Manager instance, which fires 'reconnect' after success
    socket.io.on('reconnect', handleReconnect);
    return () => {
      socket.io.off('reconnect', handleReconnect);
    };
  }, [socket]);
}

/**
 * useConnectionStatus — Reactive connection state with rich metadata.
 *
 * Returns an up-to-date snapshot of the connection, updated on every
 * connect / disconnect / reconnect event. Useful for:
 * - Showing a connection indicator in your UI
 * - Deciding whether to show a "reconnecting…" banner
 * - Logging connection quality over time
 *
 * @example
 * ```tsx
 * function ConnectionBadge() {
 *   const { isConnected, reconnectCount, lastConnectedAt } = useConnectionStatus();
 *
 *   return (
 *     <div>
 *       {isConnected ? '🟢 Connected' : '🔴 Offline'}
 *       {reconnectCount > 0 && <span> (reconnected {reconnectCount}×)</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useConnectionStatus(): ConnectionStatus {
  const { socket, isConnected } = useSocketContext();

  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);
  const [lastDisconnectedAt, setLastDisconnectedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setLastConnectedAt(new Date());
    };

    const handleDisconnect = () => {
      setLastDisconnectedAt(new Date());
    };

    const handleReconnect = () => {
      setReconnectCount(c => c + 1);
      setLastConnectedAt(new Date());
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect', handleReconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect', handleReconnect);
    };
  }, [socket]);

  return {
    isConnected,
    reconnectCount,
    lastConnectedAt,
    lastDisconnectedAt,
  };
}

/**
 * Options for the useEventReplay hook.
 */
export interface UseEventReplayOptions {
  /**
   * Called for each missed event replayed from the server.
   * Fires in chronological order (oldest first).
   */
  onReplayEvent?: (entry: EventReplayEntry) => void;

  /**
   * Called when the server has finished sending all replayed events.
   *
   * @param count - Number of events replayed
   * @param since - The timestamp replay started from
   */
  onReplayDone?: (count: number, since: number) => void;
}

/**
 * useEventReplay — Consume server-side event replay after reconnection.
 *
 * Requires:
 * 1. Server configured with `reliability.replay.enabled = true`
 * 2. Provider configured with `syncOnReconnect={true}`
 *
 * When the client reconnects, the provider automatically sends `bolt:sync`
 * to the server with the last-known connection timestamp. The server responds
 * by streaming `bolt:replay` events for each missed event, then sends
 * `bolt:replay:done` when complete.
 *
 * @example
 * ```tsx
 * useEventReplay({
 *   onReplayEvent: (entry) => {
 *     if (entry.eventName === 'order.updated') {
 *       processOrder(entry.payload as OrderPayload);
 *     }
 *   },
 *   onReplayDone: (count) => {
 *     console.log(`Caught up on ${count} missed events`);
 *   }
 * });
 * ```
 */
export function useEventReplay(options: UseEventReplayOptions = {}): void {
  const { socket } = useSocketContext();
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!socket) return;

    const handleReplay = (entry: EventReplayEntry) => {
      optionsRef.current.onReplayEvent?.(entry);
    };

    const handleReplayDone = (data: { count: number; since: number }) => {
      optionsRef.current.onReplayDone?.(data.count, data.since);
    };

    socket.on(BOLT_EVENTS.REPLAY, handleReplay);
    socket.on(BOLT_EVENTS.REPLAY_DONE, handleReplayDone);

    return () => {
      socket.off(BOLT_EVENTS.REPLAY, handleReplay);
      socket.off(BOLT_EVENTS.REPLAY_DONE, handleReplayDone);
    };
  }, [socket]);
}

/**
 * useReconnectCallback — Alias for {@link useReconnect} with a more descriptive name.
 * Preferred when used alongside useReconnect in the same component.
 */
export const useReconnectCallback = useReconnect;
