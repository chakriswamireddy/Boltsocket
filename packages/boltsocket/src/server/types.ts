import type { Server as SocketIOServer, Socket } from 'socket.io';
import type {
  EventSchema,
  EventNames,
  EventPayload,
  EventRegistry,
  ReliabilityOptions,
  EventReplayEntry,
} from '../core';
import type { EventReplayBuffer } from './reliability';

/**
 * User context attached to authenticated socket
 * Extend this interface in your application to add custom user data
 * 
 * @example
 * ```ts
 * declare module '@bolt-socket/server' {
 *   interface AuthContext {
 *     userId: string;
 *     email: string;
 *     role: 'admin' | 'user';
 *   }
 * }
 * ```
 */
export interface AuthContext {
  [key: string]: any;
}

/**
 * Authenticated socket with user context
 * Socket.IO socket extended with auth data
 */
export interface AuthenticatedSocket extends Socket {
  /**
   * User context attached after successful authentication
   * Available after auth middleware validates the connection
   */
  auth: AuthContext;
}

/**
 * Authentication result from middleware
 * Return this from your auth middleware to indicate success/failure
 */
export type AuthResult =
  | { success: true; context: AuthContext }
  | { success: false; error: string };

/**
 * Authentication middleware function
 * Validates connection and returns user context
 * 
 * @param socket - Socket.IO socket instance
 * @param handshake - Connection handshake data containing auth info
 * @returns Promise resolving to auth result
 * 
 * @example JWT validation
 * ```ts
 * const authMiddleware: AuthMiddleware = async (socket) => {
 *   const token = socket.handshake.auth.token;
 *   
 *   try {
 *     const decoded = await verifyJWT(token);
 *     return {
 *       success: true,
 *       context: {
 *         userId: decoded.sub,
 *         email: decoded.email
 *       }
 *     };
 *   } catch (error) {
 *     return {
 *       success: false,
 *       error: 'Invalid token'
 *     };
 *   }
 * };
 * ```
 */
export type AuthMiddleware = (
  socket: Socket
) => AuthResult | Promise<AuthResult>;

/**
 * Socket server configuration options
 * 
 * @template T - Event schema type
 * 
 * @example Basic setup
 * ```ts
 * const options: SocketServerOptions<typeof schema> = {
 *   events: registry,
 *   io: socketIOInstance
 * };
 * ```
 * 
 * @example With authentication
 * ```ts
 * const options: SocketServerOptions<typeof schema> = {
 *   events: registry,
 *   io: socketIOInstance,
 *   auth: async (socket) => {
 *     const token = socket.handshake.auth.token;
 *     const user = await validateToken(token);
 *     return {
 *       success: true,
 *       context: { userId: user.id, email: user.email }
 *     };
 *   }
 * };
 * ```
 */
export interface SocketServerOptions<T extends EventSchema> {
  /**
   * The event registry to use for validation
   * All emitted events must be registered here
   */
  events: EventRegistry<T>;

  /**
   * Optional Socket.IO server instance (if already created)
   * Can also be attached later using `attach()`
   */
  io?: SocketIOServer;

  /**
   * Optional authentication middleware
   * Validates connections and attaches user context to socket
   * If provided, unauthenticated connections will be rejected
   *
   * @example
   * ```ts
   * auth: async (socket) => {
   *   const token = socket.handshake.auth.token;
   *   if (!token) {
   *     return { success: false, error: 'No token provided' };
   *   }
   *
   *   const user = await validateToken(token);
   *   return {
   *     success: true,
   *     context: { userId: user.id, email: user.email }
   *   };
   * }
   * ```
   */
  auth?: AuthMiddleware;

  /**
   * Reliability options for reconnection handling and event replay.
   *
   * @example With event replay enabled
   * ```ts
   * reliability: {
   *   replay: {
   *     enabled: true,
   *     bufferSize: 500,
   *     ttlMs: 10 * 60 * 1000 // 10 minutes
   *   }
   * }
   * ```
   */
  reliability?: ReliabilityOptions;
}

/**
 * Socket server interface with type-safe emit
 * Provides validated, type-safe event emission
 * 
 * @template T - Event schema type
 * 
 * @example
 * ```ts
 * const server = createSocketServer({ events });
 * 
 * // ✅ Event name autocompletes
 * // ✅ Payload type is inferred and validated
 * server.emit('order.updated', {
 *   orderId: '123',
 *   status: 'completed'
 * });
 * 
 * // ❌ TypeScript error - unknown event
 * server.emit('invalid.event', {});
 * 
 * // ❌ TypeScript error - wrong payload shape
 * server.emit('order.updated', { wrong: 'data' });
 * ```
 */
export interface SocketServer<T extends EventSchema> {
  /**
   * Emit a typed event to all connected clients
   * 
   * Event name autocompletes and payload type is inferred from schema.
   * Validates payload before emitting.
   * 
   * @param eventName - Event name (autocompletes in IDE)
   * @param payload - Event payload (type-checked against schema)
   * @throws {UnknownEventError} If event not in registry
   * @throws {ValidationError} If payload validation fails
   * @throws {Error} If Socket.IO server not attached
   * 
   * @example
   * ```ts
   * // ✅ Fully typed and validated
   * server.emit('order.updated', {
   *   orderId: '123',
   *   status: 'completed'
   * });
   * ```
   */
  emit<E extends EventNames<T>>(
    eventName: E,
    payload: EventPayload<T, E>
  ): void;

  /**
   * Get the underlying Socket.IO server instance
   * 
   * @returns Socket.IO server or undefined if not attached
   * 
   * @example
   * ```ts
   * const io = server.getIO();
   * if (io) {
   *   console.log('Clients:', io.sockets.sockets.size);
   * }
   * ```
   */
  getIO(): SocketIOServer | undefined;

  /**
   * Get the event registry
   * 
   * @returns Event registry instance
   * 
   * @example
   * ```ts
   * const registry = server.getRegistry();
   * const events = registry.getEventNames();
   * ```
   */
  getRegistry(): EventRegistry<T>;

  /**
   * Attach to an existing Socket.IO server
   * 
   * @param io - Socket.IO server instance
   * 
   * @example
   * ```ts
   * const server = createSocketServer({ events });
   * // Later...
   * server.attach(io);
   * ```
   */
  attach(io: SocketIOServer): void;

  /**
   * Join a socket to a room for targeted messaging
   * 
   * @param socketId - Socket identifier to join the room
   * @param roomName - Room name (e.g., 'order:123', 'user:456')
   * @throws {Error} If Socket.IO server not attached
   * @throws {Error} If socket not found
   * 
   * @example
   * ```ts
   * io.on('connection', (socket) => {
   *   // User joins their personal notification room
   *   server.joinRoom(socket.id, `user:${userId}`);
   *   
   *   // User subscribes to an order
   *   server.joinRoom(socket.id, `order:${orderId}`);
   * });
   * ```
   */
  joinRoom(socketId: string, roomName: string): void;

  /**
   * Remove a socket from a room
   * 
   * @param socketId - Socket identifier to leave the room
   * @param roomName - Room name to leave
   * @throws {Error} If Socket.IO server not attached
   * @throws {Error} If socket not found
   * 
   * @example
   * ```ts
   * // User unsubscribes from order updates
   * server.leaveRoom(socket.id, `order:${orderId}`);
   * ```
   */
  leaveRoom(socketId: string, roomName: string): void;

  /**
   * Emit a typed event to a specific room
   * 
   * Only sockets that have joined this room will receive the event.
   * 
   * @param roomName - Room name to emit to
   * @param eventName - Event name (autocompletes in IDE)
   * @param payload - Event payload (type-checked against schema)
   * @throws {UnknownEventError} If event not in registry
   * @throws {ValidationError} If payload validation fails
   * @throws {Error} If Socket.IO server not attached
   * 
   * @example
   * ```ts
   * // Notify only users in a specific order room
   * server.emitToRoom('order:123', 'order.updated', {
   *   orderId: '123',
   *   status: 'completed'
   * });
   * ```
   */
  emitToRoom<E extends EventNames<T>>(
    roomName: string,
    eventName: E,
    payload: EventPayload<T, E>
  ): void;

  /**
   * Get a room emitter for fluent API
   * 
   * Returns a scoped emitter that only sends to the specified room.
   * Provides a cleaner API for room-specific emissions.
   * 
   * @param roomName - Room name to target
   * @returns Room emitter with type-safe emit method
   * 
   * @example
   * ```ts
   * // Fluent API - cleaner for multiple emissions to same room
   * server.toRoom('order:123').emit('order.updated', {
   *   orderId: '123',
   *   status: 'completed'
   * });
   * 
   * // Multiple events to same room
   * const orderRoom = server.toRoom('order:123');
   * orderRoom.emit('order.updated', { orderId: '123', status: 'completed' });
   * orderRoom.emit('notification', { message: 'Order processed', type: 'success' });
   * ```
   */
  toRoom(roomName: string): RoomEmitter<T>;

  /**
   * Get authenticated socket by socket ID
   * Returns the socket with auth context if authentication is configured
   * 
   * @param socketId - Socket identifier
   * @returns Authenticated socket or undefined if not found
   * @throws {Error} If Socket.IO server not attached
   * 
   * @example
   * ```ts
   * const socket = server.getAuthSocket(socketId);
   * if (socket) {
   *   console.log('User ID:', socket.auth.userId);
   *   console.log('User email:', socket.auth.email);
   * }
   * ```
   */
  getAuthSocket(socketId: string): AuthenticatedSocket | undefined;

  /**
   * Get all connected authenticated sockets
   * Useful for broadcasting or finding specific users
   *
   * @returns Array of authenticated sockets
   * @throws {Error} If Socket.IO server not attached
   *
   * @example
   * ```ts
   * const sockets = server.getAllAuthSockets();
   * const onlineUsers = sockets.map(s => s.auth.userId);
   * console.log('Online users:', onlineUsers);
   * ```
   */
  getAllAuthSockets(): AuthenticatedSocket[];

  // ─── Phase 7: Reliability ────────────────────────────────────────────────

  /**
   * Register a callback that fires whenever a client reconnects and requests sync.
   * Useful for re-joining rooms or sending fresh state to the client.
   *
   * @param handler - Called with the socket that reconnected and missed entries
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const off = server.onClientReconnect((socket, missed) => {
   *   console.log(`Socket ${socket.id} missed ${missed.length} events`);
   *   // Re-join user rooms, push fresh state, etc.
   *   server.joinRoom(socket.id, `user:${socket.auth?.userId}`);
   * });
   *
   * // Later: stop listening
   * off();
   * ```
   */
  onClientReconnect(
    handler: (socket: Socket, missedEvents: EventReplayEntry[]) => void
  ): () => void;

  /**
   * Replay all buffered events that occurred after `since` to a specific socket.
   * Call this inside `onClientReconnect` or a `bolt:sync` handler to catch up a client.
   *
   * @param socketId - Target socket to receive replayed events
   * @param since    - Unix timestamp (ms) — replay events after this point
   * @param rooms    - Optional room filter (only events for these rooms + global)
   *
   * @example
   * ```ts
   * server.onClientReconnect((socket, missed) => {
   *   const lastSeen = getLastSeenTimestamp(socket.auth.userId);
   *   server.replayEventsTo(socket.id, lastSeen);
   * });
   * ```
   */
  replayEventsTo(socketId: string, since: number, rooms?: string[]): void;

  /**
   * Access the underlying event replay buffer (if replay is enabled).
   * Returns undefined when reliability.replay.enabled is false.
   *
   * @example
   * ```ts
   * const buffer = server.getReplayBuffer();
   * console.log('Buffered events:', buffer?.size());
   * ```
   */
  getReplayBuffer(): EventReplayBuffer | undefined;
}

/**
 * Room emitter interface for targeted emissions
 * Provides type-safe emit scoped to a specific room
 * 
 * @template T - Event schema type
 * 
 * @example
 * ```ts
 * const roomEmitter = server.toRoom('order:123');
 * 
 * // ✅ Type-safe emit to room
 * roomEmitter.emit('order.updated', {
 *   orderId: '123',
 *   status: 'completed'
 * });
 * ```
 */
export interface RoomEmitter<T extends EventSchema> {
  /**
   * Emit a typed event to the room
   * 
   * @param eventName - Event name (autocompletes in IDE)
   * @param payload - Event payload (type-checked against schema)
   * @throws {UnknownEventError} If event not in registry
   * @throws {ValidationError} If payload validation fails
   * 
   * @example
   * ```ts
   * roomEmitter.emit('order.updated', {
   *   orderId: '123',
   *   status: 'completed'
   * });
   * ```
   */
  emit<E extends EventNames<T>>(
    eventName: E,
    payload: EventPayload<T, E>
  ): void;
}

