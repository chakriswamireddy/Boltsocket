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
} from './types';
