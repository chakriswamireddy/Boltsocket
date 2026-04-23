/**
 * Example: Server Layer Usage
 * 
 * Demonstrates how to create and use the typed Socket.IO server wrapper
 */

import { z } from 'zod';
import { Server } from 'socket.io';
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';

// Define your event schema
const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    timestamp: z.number(),
  }),
  'user.connected': z.object({
    userId: z.string(),
    username: z.string(),
  }),
  'notification.sent': z.object({
    recipientId: z.string(),
    message: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  }),
});

// Create Socket.IO server (in real app, this would be attached to HTTP server)
const io = new Server(3000);

// Create typed server wrapper
const server = createSocketServer({ events, io });

// ✅ Type-safe emit with validation
function notifyOrderUpdate(orderId: string, status: string) {
  try {
    server.emit('order.updated', {
      orderId,
      status: status as any, // TypeScript will catch invalid statuses
      timestamp: Date.now(),
    });
    console.log('✅ Order update emitted');
  } catch (error) {
    console.error('❌ Failed to emit:', error);
  }
}

// ✅ Validation catches invalid payloads
function sendInvalidEvent() {
  try {
    server.emit('order.updated', {
      orderId: '123',
      // Missing required fields - will throw ValidationError
    } as any);
  } catch (error) {
    console.error('❌ Validation failed (expected):', error.message);
  }
}

// ❌ Unknown events are caught
function tryUnknownEvent() {
  try {
    // @ts-expect-error - TypeScript catches this
    server.emit('unknown.event', { data: 'test' });
  } catch (error) {
    console.error('❌ Unknown event (expected):', error.message);
  }
}

// Example: Attach to existing Socket.IO server
function attachToExistingServer() {
  const existingIO = new Server(3001);
  const serverWithoutIO = createSocketServer({ events });
  
  // Attach later
  serverWithoutIO.attach(existingIO);
  
  // Now can emit events
  serverWithoutIO.emit('user.connected', {
    userId: '456',
    username: 'john_doe',
  });
}

// Example: Access underlying IO and registry
function accessInternals() {
  const io = server.getIO();
  const registry = server.getRegistry();
  
  console.log('Connected clients:', io?.sockets.sockets.size);
  console.log('Registered events:', registry.getEventNames());
}

// Run examples
console.log('=== BoltSocket Server Layer Examples ===\n');

console.log('1. Valid event emission:');
notifyOrderUpdate('ORD-123', 'completed');

console.log('\n2. Invalid payload (validation):');
sendInvalidEvent();

console.log('\n3. Unknown event:');
tryUnknownEvent();

console.log('\n4. Access internals:');
accessInternals();

console.log('\n✅ All examples completed!');

// Clean up
io.close();
