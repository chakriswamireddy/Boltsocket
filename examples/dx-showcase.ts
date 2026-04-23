/**
 * Developer Experience (DX) Examples
 * 
 * This file demonstrates the compile-time safety and IDE features
 * that make BoltSocket a joy to use.
 */

import { z } from 'zod';
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';
import { useSocketEvent } from '@bolt-socket/react';

// ============================================================================
// 1. STRONG TYPING - Event Names Autocomplete
// ============================================================================

// Define events with const assertion for maximum type safety
const events = createEventRegistry({
  'order.created': z.object({
    orderId: z.string(),
    userId: z.string(),
    total: z.number(),
  }),
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    timestamp: z.number(),
  }),
  'user.connected': z.object({
    userId: z.string(),
    username: z.string(),
    timestamp: z.number(),
  }),
});

// ============================================================================
// 2. SERVER-SIDE TYPE SAFETY
// ============================================================================

function serverExamples() {
  const server = createSocketServer({ events });

  // ✅ GOOD: Event name autocompletes in your IDE
  // ✅ GOOD: Payload type is inferred and validated
  server.emit('order.updated', {
    orderId: '123',
    status: 'completed',
    timestamp: Date.now(),
  });

  // ❌ TypeScript ERROR: Unknown event name
  // @ts-expect-error - Event doesn't exist
  server.emit('invalid.event', {});

  // ❌ TypeScript ERROR: Wrong payload shape
  // @ts-expect-error - Missing required fields
  server.emit('order.updated', {
    orderId: '123',
    // Missing: status, timestamp
  });

  // ❌ TypeScript ERROR: Wrong field types
  // @ts-expect-error - Wrong types
  server.emit('order.updated', {
    orderId: 123, // Should be string
    status: 'invalid-status', // Not in enum
    timestamp: 'not-a-number', // Should be number
  });

  // ✅ GOOD: IDE shows hover information
  // Hover over 'order.updated' to see payload shape
  server.emit('order.updated', {
    orderId: '123',
    status: 'completed',
    timestamp: Date.now(),
  });
}

// ============================================================================
// 3. CLIENT-SIDE (REACT) TYPE SAFETY
// ============================================================================

function OrderMonitor() {
  // ✅ GOOD: Event name autocompletes
  // ✅ GOOD: Handler payload is fully typed
  useSocketEvent('order.updated', (data) => {
    // ✅ data.orderId is typed as string
    // ✅ data.status is typed as enum
    // ✅ data.timestamp is typed as number
    console.log('Order', data.orderId, 'status:', data.status);
    
    // ✅ IDE provides autocomplete for data properties
    const id = data.orderId;
    const status = data.status;
    const time = data.timestamp;
  });

  // ❌ TypeScript ERROR: Unknown event name
  // @ts-expect-error - Event doesn't exist
  useSocketEvent('invalid.event', (data) => {
    console.log(data);
  });

  // ✅ GOOD: Multiple events with different payload types
  useSocketEvent('order.created', (data) => {
    // data is typed as { orderId: string; userId: string; total: number }
    console.log('New order', data.orderId, 'for', data.userId);
  });

  useSocketEvent('user.connected', (data) => {
    // data is typed as { userId: string; username: string; timestamp: number }
    console.log('User', data.username, 'connected');
  });

  return <div>Monitoring...</div>;
}

// ============================================================================
// 4. PAYLOAD INFERENCE IN IDE
// ============================================================================

function payloadInferenceExamples() {
  const server = createSocketServer({ events });

  // Hover over these to see the inferred types in your IDE:
  
  // Type: { orderId: string; userId: string; total: number }
  const orderCreatedPayload = {
    orderId: '123',
    userId: 'user-456',
    total: 99.99,
  };

  // Type: { orderId: string; status: 'pending' | 'processing' | 'completed' | 'cancelled'; timestamp: number }
  const orderUpdatedPayload = {
    orderId: '123',
    status: 'completed' as const,
    timestamp: Date.now(),
  };

  // ✅ All fields are type-checked
  server.emit('order.created', orderCreatedPayload);
  server.emit('order.updated', orderUpdatedPayload);
}

// ============================================================================
// 5. EXTRACT TYPES FOR REUSE
// ============================================================================

import type { EventPayload, EventNames, EventMap } from '@bolt-socket/core';

// Extract specific event payload type
type OrderUpdatedEvent = EventPayload<typeof events, 'order.updated'>;
// Result: { orderId: string; status: 'pending' | 'processing' | 'completed' | 'cancelled'; timestamp: number }

// Get all event names as union
type AllEvents = EventNames<typeof events>;
// Result: 'order.created' | 'order.updated' | 'user.connected'

// Get complete event map
type CompleteEventMap = EventMap<typeof events>;
// Result: {
//   'order.created': { orderId: string; userId: string; total: number };
//   'order.updated': { orderId: string; status: ...; timestamp: number };
//   'user.connected': { userId: string; username: string; timestamp: number };
// }

// Use extracted types in your code
function processOrder(order: OrderUpdatedEvent) {
  console.log('Processing order', order.orderId);
  if (order.status === 'completed') {
    console.log('Order completed!');
  }
}

// ============================================================================
// 6. IDE FEATURES SHOWCASE
// ============================================================================

/**
 * Try these in your IDE:
 * 
 * 1. AUTOCOMPLETE
 *    - Type `server.emit('` and see all event names
 *    - Type `useSocketEvent('` and see all event names
 * 
 * 2. HOVER INFORMATION
 *    - Hover over event names to see payload shape
 *    - Hover over `data` in handler to see type
 * 
 * 3. GO TO DEFINITION
 *    - Cmd/Ctrl+Click on event name to jump to schema
 * 
 * 4. RENAME REFACTORING
 *    - Rename an event in schema, all usages update
 * 
 * 5. ERROR DETECTION
 *    - Try emitting wrong payload - instant red squiggle
 *    - Try unknown event - instant error
 * 
 * 6. INTELLISENSE
 *    - Type `data.` in handler to see all properties
 *    - Type `events.` to see all methods
 */

// ============================================================================
// 7. VALIDATION AT COMPILE TIME AND RUNTIME
// ============================================================================

function validationExample() {
  const server = createSocketServer({ events });

  // ✅ Compile-time: TypeScript catches type errors
  // ✅ Runtime: Zod validates actual values
  
  try {
    // This payload passes TypeScript but might fail at runtime
    const payload: OrderUpdatedEvent = {
      orderId: '123',
      status: 'completed',
      timestamp: Date.now(),
    };

    // Runtime validation happens here
    server.emit('order.updated', payload);
  } catch (error) {
    // ValidationError will be thrown if Zod validation fails
    console.error('Validation failed:', error);
  }
}

// ============================================================================
// 8. BENEFITS SUMMARY
// ============================================================================

/**
 * With BoltSocket, you get:
 * 
 * ✅ Event name autocomplete in IDE
 * ✅ Payload type inference from Zod schemas
 * ✅ Compile-time error detection
 * ✅ Runtime validation with Zod
 * ✅ IDE hover shows payload shape
 * ✅ Go-to-definition for event schemas
 * ✅ Safe refactoring with rename
 * ✅ No string literals - all type-checked
 * ✅ Single source of truth (schema)
 * ✅ Prevents invalid usage before runtime
 * 
 * This eliminates entire classes of bugs:
 * ❌ Typos in event names
 * ❌ Wrong payload shapes
 * ❌ Missing required fields
 * ❌ Wrong field types
 * ❌ Outdated event usages after schema changes
 */

console.log('✅ DX Examples - See code for IDE features showcase');
