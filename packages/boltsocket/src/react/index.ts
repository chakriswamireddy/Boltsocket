/**
 * @bolt-socket/react
 *
 * React hooks and components for type-safe WebSocket events.
 * Provides declarative API with automatic lifecycle management.
 */

export { SocketProvider, useSocket } from './SocketProvider';
export { useSocketEvent, useSocketEventOnce } from './useSocketEvent';
export type {
  SocketProviderProps,
  SocketContextValue,
  EventHandler,
  AuthProvider,
  SocketIOClientOptions,
  AuthError,
  SocketCallbacks,
  ReconnectOptions,
} from './types';

// ── Phase 7: Reliability hooks ────────────────────────────────────────────────
export {
  useReconnect,
  useReconnectCallback,
  useConnectionStatus,
  useEventReplay,
} from './useReconnect';
export type { ConnectionStatus, UseEventReplayOptions } from './useReconnect';

// ── Phase 8: Observability hooks ──────────────────────────────────────────────
export {
  useDebugLogs,
  useEventTraces,
  useDevMode,
} from './useDebugLogs';
export type {
  UseDebugLogsOptions,
  UseDebugLogsResult,
  UseEventTracesOptions,
  UseEventTracesResult,
} from './useDebugLogs';
