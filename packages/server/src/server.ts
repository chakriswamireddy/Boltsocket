import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  EventSchema,
  EventNames,
  EventPayload,
  EventRegistry,
  UnknownEventError,
  ValidationError,
} from '@bolt-socket/core';
import type { SocketServerOptions, SocketServer, RoomEmitter, AuthenticatedSocket } from './types';

/**
 * Create a type-safe Socket.IO server wrapper
 * 
 * This is a thin orchestration layer that:
 * - Validates payloads before emitting
 * - Provides type-safe emit API
 * - Prevents emitting unknown events
 * - Handles connection lifecycle minimally
 * 
 * @example
 * ```ts
 * import { createEventRegistry } from '@bolt-socket/core';
 * import { createSocketServer } from '@bolt-socket/server';
 * import { z } from 'zod';
 * 
 * const events = createEventRegistry({
 *   'order.updated': z.object({
 *     orderId: z.string(),
 *     status: z.string()
 *   })
 * });
 * 
 * const server = createSocketServer({ events });
 * 
 * // Attach to existing Socket.IO server
 * server.attach(io);
 * 
 * // Type-safe, validated emit
 * server.emit('order.updated', {
 *   orderId: '123',
 *   status: 'completed'
 * });
 * ```
 */
export function createSocketServer<T extends EventSchema>(
  options: SocketServerOptions<T>
): SocketServer<T> {
  const { events, io: initialIO, auth: authMiddleware } = options;

  // Internal state
  let io: SocketIOServer | undefined = initialIO;

  // Helper to set up auth middleware
  const setupAuthMiddleware = (socketIO: SocketIOServer) => {
    if (!authMiddleware) return;

    socketIO.use(async (socket: Socket, next) => {
      try {
        const result = await authMiddleware(socket);
        
        if (result.success) {
          // Attach user context to socket
          (socket as AuthenticatedSocket).auth = result.context;
          next();
        } else {
          // Reject connection with error
          next(new Error(result.error));
        }
      } catch (error) {
        // Handle unexpected errors
        const message = error instanceof Error ? error.message : 'Authentication failed';
        next(new Error(message));
      }
    });
  };

  // Basic connection handling if IO is provided
  if (io) {
    setupAuthMiddleware(io);
    
    io.on('connection', (socket) => {
      // Minimal lifecycle handling - just log connection/disconnection
      // No business logic here
      socket.on('disconnect', () => {
        // Socket disconnected - framework handles cleanup
      });
    });
  }

  return {
    emit<E extends EventNames<T>>(
      eventName: E,
      payload: EventPayload<T, E>
    ): void {
      // Validate event exists
      if (!events.hasEvent(eventName)) {
        throw new UnknownEventError(String(eventName));
      }

      // Validate payload before emitting
      const result = events.validate(eventName, payload);
      
      if (!result.success) {
        // Format error details
        const issues = result.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        throw new ValidationError(String(eventName), issues);
      }

      // Emit only if IO is attached
      if (!io) {
        throw new Error(
          'Socket.IO server not attached. Call attach(io) before emitting events.'
        );
      }

      // Emit the validated event to all connected clients
      io.emit(eventName, result.data);
    },

    getIO(): SocketIOServer | undefined {
      return io;
    },

    getRegistry(): EventRegistry<T> {
      return events;
    },

    attach(socketIO: SocketIOServer): void {
      io = socketIO;

      // Set up auth middleware if provided
      setupAuthMiddleware(io);

      // Set up minimal connection lifecycle handling
      io.on('connection', (socket) => {
        // Minimal lifecycle handling
        socket.on('disconnect', () => {
          // Socket disconnected - framework handles cleanup
        });
      });
    },

    joinRoom(socketId: string, roomName: string): void {
      if (!io) {
        throw new Error(
          'Socket.IO server not attached. Call attach(io) before using rooms.'
        );
      }

      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        throw new Error(`Socket with id "${socketId}" not found`);
      }

      socket.join(roomName);
    },

    leaveRoom(socketId: string, roomName: string): void {
      if (!io) {
        throw new Error(
          'Socket.IO server not attached. Call attach(io) before using rooms.'
        );
      }

      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        throw new Error(`Socket with id "${socketId}" not found`);
      }

      socket.leave(roomName);
    },

    emitToRoom<E extends EventNames<T>>(
      roomName: string,
      eventName: E,
      payload: EventPayload<T, E>
    ): void {
      // Validate event exists
      if (!events.hasEvent(eventName)) {
        throw new UnknownEventError(String(eventName));
      }

      // Validate payload before emitting
      const result = events.validate(eventName, payload);
      
      if (!result.success) {
        // Format error details
        const issues = result.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        throw new ValidationError(String(eventName), issues);
      }

      // Emit only if IO is attached
      if (!io) {
        throw new Error(
          'Socket.IO server not attached. Call attach(io) before emitting events.'
        );
      }

      // Emit the validated event to the specific room
      io.to(roomName).emit(eventName, result.data);
    },

    toRoom(roomName: string): RoomEmitter<T> {
      // Return a scoped emitter for the room
      return {
        emit<E extends EventNames<T>>(
          eventName: E,
          payload: EventPayload<T, E>
        ): void {
          // Validate event exists
          if (!events.hasEvent(eventName)) {
            throw new UnknownEventError(String(eventName));
          }

          // Validate payload before emitting
          const result = events.validate(eventName, payload);
          
          if (!result.success) {
            // Format error details
            const issues = result.error.issues
              .map(issue => `${issue.path.join('.')}: ${issue.message}`)
              .join('; ');
            throw new ValidationError(String(eventName), issues);
          }

          // Emit only if IO is attached
          if (!io) {
            throw new Error(
              'Socket.IO server not attached. Call attach(io) before emitting events.'
            );
          }

          // Emit the validated event to the specific room
          io.to(roomName).emit(eventName, result.data);
        },
      };
    },

    getAuthSocket(socketId: string): AuthenticatedSocket | undefined {
      if (!io) {
        throw new Error(
          'Socket.IO server not attached. Call attach(io) before accessing sockets.'
        );
      }

      const socket = io.sockets.sockets.get(socketId);
      return socket as AuthenticatedSocket | undefined;
    },

    getAllAuthSockets(): AuthenticatedSocket[] {
      if (!io) {
        throw new Error(
          'Socket.IO server not attached. Call attach(io) before accessing sockets.'
        );
      }

      return Array.from(io.sockets.sockets.values()) as AuthenticatedSocket[];
    },
  };
}
