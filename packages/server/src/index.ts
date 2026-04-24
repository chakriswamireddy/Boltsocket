/**
 * @bolt-socket/server
 *
 * Socket.IO server abstraction with type-safe event emission.
 * Provides validated, type-safe emit functionality with minimal overhead.
 */

export { createSocketServer } from './server';
export type {
  SocketServerOptions,
  SocketServer,
  RoomEmitter,
  AuthContext,
  AuthenticatedSocket,
  AuthResult,
  AuthMiddleware,
} from './types';

// ── Phase 7: Reliability ──────────────────────────────────────────────────────
export { EventReplayBuffer } from './reliability';
