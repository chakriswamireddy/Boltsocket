import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  EventSchema,
  EventNames,
  EventPayload,
  EventRegistry,
  UnknownEventError,
  ValidationError,
  BOLT_EVENTS,
  logger,
  tracer,
} from '../core';
import type {
  BoltSyncPayload,
  EventReplayEntry,
} from '../core';
import type {
  SocketServerOptions,
  SocketServer,
  RoomEmitter,
  AuthenticatedSocket,
} from './types';
import { EventReplayBuffer } from './reliability';

/**
 * Create a type-safe Socket.IO server wrapper.
 *
 * Thin orchestration layer that:
 * - Validates payloads before emitting                             (Phase 2)
 * - Room management with fluent API                               (Phase 5)
 * - Auth middleware and per-connection token validation            (Phase 6)
 * - Reconnection reliability with server-side event replay        (Phase 7)
 * - Structured logging and event tracing via enableDebugLogs()    (Phase 8)
 *
 * @example Basic
 * ```ts
 * const server = createSocketServer({ events, io });
 * server.emit('order.updated', { orderId: '123', status: 'completed' });
 * ```
 *
 * @example With auth + replay
 * ```ts
 * const server = createSocketServer({
 *   events, io,
 *   auth: async (socket) => { ... },
 *   reliability: { replay: { enabled: true, bufferSize: 500 } }
 * });
 * ```
 */
export function createSocketServer<T extends EventSchema>(
  options: SocketServerOptions<T>
): SocketServer<T> {
  const { events, io: initialIO, auth: authMiddleware, reliability } = options;

  let io: SocketIOServer | undefined = initialIO;

  // Phase 7: Replay buffer (only allocated when enabled)
  const replayBuffer = reliability?.replay?.enabled
    ? new EventReplayBuffer(reliability.replay)
    : undefined;

  // Phase 7: Registered onClientReconnect handlers
  const reconnectHandlers: Array<
    (socket: Socket, missedEvents: EventReplayEntry[]) => void
  > = [];

  // ─── Internal helpers ────────────────────────────────────────────────────

  function validatePayload<E extends EventNames<T>>(
    eventName: E,
    payload: EventPayload<T, E>
  ): EventPayload<T, E> {
    if (!events.hasEvent(eventName)) {
      logger.error('event', `Unknown event: "${String(eventName)}"`, { eventName });
      throw new UnknownEventError(String(eventName));
    }

    const result = events.validate(eventName, payload);

    if (!result.success) {
      const issues = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');

      // Phase 8: Trace the failed validation
      tracer.trace({
        eventName: String(eventName),
        direction: 'outbound',
        payload,
        validated: false,
        validationError: issues,
      });

      logger.warn('validation', `Payload validation failed for "${String(eventName)}"`, {
        eventName,
        issues,
      });

      throw new ValidationError(String(eventName), issues);
    }

    // Phase 8: Trace the successful outbound event
    tracer.trace({
      eventName: String(eventName),
      direction: 'outbound',
      payload: result.data,
      validated: true,
    });

    logger.debug('event', `Emitting "${String(eventName)}"`, { eventName, payload: result.data });

    return result.data;
  }

  function requireIO(): SocketIOServer {
    if (!io) {
      throw new Error(
        'Socket.IO server not attached. Call attach(io) before using this method.'
      );
    }
    return io;
  }

  // ─── Auth middleware ──────────────────────────────────────────────────────

  function setupAuthMiddleware(socketIO: SocketIOServer): void {
    if (!authMiddleware) return;

    socketIO.use(async (socket: Socket, next) => {
      try {
        const result = await authMiddleware(socket);

        if (result.success) {
          (socket as AuthenticatedSocket).auth = result.context;
          logger.info('auth', `Socket authenticated`, {
            socketId: socket.id,
            context: result.context,
          });
          next();
        } else {
          logger.warn('auth', `Auth rejected: ${result.error}`, {
            socketId: socket.id,
            error: result.error,
          });
          next(new Error(result.error));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        logger.error('auth', `Auth middleware threw: ${message}`, { socketId: socket.id, error });
        next(new Error(message));
      }
    });
  }

  // ─── Connection lifecycle ─────────────────────────────────────────────────

  function setupConnectionHandlers(socketIO: SocketIOServer): void {
    socketIO.on('connection', (socket: Socket) => {
      logger.info('connection', `Client connected`, { socketId: socket.id });

      // Phase 7: Send session info so client can request replay on reconnect
      if (replayBuffer) {
        socket.emit(BOLT_EVENTS.SESSION, {
          sessionId: socket.id,
          connectedAt: Date.now(),
        });

        // Phase 7: Handle sync request from reconnecting client
        socket.on(BOLT_EVENTS.SYNC, (payload: BoltSyncPayload) => {
          const since = payload?.since ?? 0;
          const rooms = payload?.rooms;
          const missed = replayBuffer.getEventsSince(since, rooms);

          logger.info('replay', `Client sync requested`, {
            socketId: socket.id,
            since,
            missedCount: missed.length,
            rooms,
          });

          // Notify registered reconnect handlers
          for (const handler of reconnectHandlers) {
            try {
              handler(socket, missed);
            } catch (err) {
              logger.error('reliability', 'onClientReconnect handler threw', { err });
            }
          }

          // Replay each missed event to this socket
          for (const entry of missed) {
            socket.emit(BOLT_EVENTS.REPLAY, entry);
          }
          socket.emit(BOLT_EVENTS.REPLAY_DONE, { count: missed.length, since });

          logger.debug('replay', `Replay complete`, {
            socketId: socket.id,
            count: missed.length,
          });
        });
      }

      socket.on('disconnect', (reason) => {
        logger.info('connection', `Client disconnected`, { socketId: socket.id, reason });
      });
    });
  }

  // Bootstrap if IO already provided
  if (io) {
    setupAuthMiddleware(io);
    setupConnectionHandlers(io);
  }

  // ─── Public server object ─────────────────────────────────────────────────

  return {
    // ── Core emit ────────────────────────────────────────────────────────────

    emit<E extends EventNames<T>>(eventName: E, payload: EventPayload<T, E>): void {
      const validatedData = validatePayload(eventName, payload);
      requireIO().emit(eventName, validatedData);

      replayBuffer?.add({
        eventName: String(eventName),
        payload: validatedData,
        timestamp: Date.now(),
      });
    },

    // ── Introspection ────────────────────────────────────────────────────────

    getIO(): SocketIOServer | undefined {
      return io;
    },

    getRegistry(): EventRegistry<T> {
      return events;
    },

    // ── Attach ───────────────────────────────────────────────────────────────

    attach(socketIO: SocketIOServer): void {
      io = socketIO;
      setupAuthMiddleware(io);
      setupConnectionHandlers(io);
      logger.info('connection', 'Socket.IO server attached');
    },

    // ── Rooms ────────────────────────────────────────────────────────────────

    joinRoom(socketId: string, roomName: string): void {
      const socket = requireIO().sockets.sockets.get(socketId);
      if (!socket) throw new Error(`Socket with id "${socketId}" not found`);
      socket.join(roomName);
      logger.debug('room', `Socket joined room`, { socketId, roomName });
    },

    leaveRoom(socketId: string, roomName: string): void {
      const socket = requireIO().sockets.sockets.get(socketId);
      if (!socket) throw new Error(`Socket with id "${socketId}" not found`);
      socket.leave(roomName);
      logger.debug('room', `Socket left room`, { socketId, roomName });
    },

    emitToRoom<E extends EventNames<T>>(
      roomName: string,
      eventName: E,
      payload: EventPayload<T, E>
    ): void {
      const validatedData = validatePayload(eventName, payload);
      requireIO().to(roomName).emit(eventName, validatedData);

      // Override the trace room field now that we know the target room
      tracer.trace({
        eventName: String(eventName),
        direction: 'outbound',
        payload: validatedData,
        validated: true,
        room: roomName,
      });

      logger.debug('event', `Room emit "${String(eventName)}" → "${roomName}"`, {
        eventName,
        roomName,
      });

      replayBuffer?.add({
        eventName: String(eventName),
        payload: validatedData,
        timestamp: Date.now(),
        room: roomName,
      });
    },

    toRoom(roomName: string): RoomEmitter<T> {
      return {
        emit: <E extends EventNames<T>>(
          eventName: E,
          payload: EventPayload<T, E>
        ): void => {
          const validatedData = validatePayload(eventName, payload);
          requireIO().to(roomName).emit(eventName, validatedData);

          replayBuffer?.add({
            eventName: String(eventName),
            payload: validatedData,
            timestamp: Date.now(),
            room: roomName,
          });
        },
      };
    },

    // ── Auth sockets ──────────────────────────────────────────────────────────

    getAuthSocket(socketId: string): AuthenticatedSocket | undefined {
      const socket = requireIO().sockets.sockets.get(socketId);
      return socket as AuthenticatedSocket | undefined;
    },

    getAllAuthSockets(): AuthenticatedSocket[] {
      return Array.from(requireIO().sockets.sockets.values()) as AuthenticatedSocket[];
    },

    // ── Phase 7: Reliability ──────────────────────────────────────────────────

    onClientReconnect(
      handler: (socket: Socket, missedEvents: EventReplayEntry[]) => void
    ): () => void {
      reconnectHandlers.push(handler);
      logger.debug('reliability', 'onClientReconnect handler registered');
      return () => {
        const idx = reconnectHandlers.indexOf(handler);
        if (idx !== -1) reconnectHandlers.splice(idx, 1);
        logger.debug('reliability', 'onClientReconnect handler removed');
      };
    },

    replayEventsTo(socketId: string, since: number, rooms?: string[]): void {
      if (!replayBuffer) {
        throw new Error(
          'Event replay is not enabled. Set reliability.replay.enabled = true in createSocketServer options.'
        );
      }
      const currentIO = requireIO();
      const socket = currentIO.sockets.sockets.get(socketId);
      if (!socket) throw new Error(`Socket with id "${socketId}" not found`);

      const missed = replayBuffer.getEventsSince(since, rooms);

      logger.info('replay', `Manual replay to socket`, {
        socketId,
        since,
        count: missed.length,
      });

      for (const entry of missed) {
        socket.emit(BOLT_EVENTS.REPLAY, entry);
      }
      socket.emit(BOLT_EVENTS.REPLAY_DONE, { count: missed.length, since });
    },

    getReplayBuffer(): EventReplayBuffer | undefined {
      return replayBuffer;
    },
  };
}

