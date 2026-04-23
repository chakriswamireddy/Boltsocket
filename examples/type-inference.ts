import { createEventRegistry } from '@bolt-socket/core';
import type { EventNames, EventPayload, EventMap } from '@bolt-socket/core';
import { z } from 'zod';

// ============================================
// Type Inference Examples
// ============================================
console.log('=== TypeScript Type Inference Demo ===\n');

// Define event registry
const events = createEventRegistry({
  'order.created': z.object({
    orderId: z.string(),
    total: z.number(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
    })),
  }),
  'user.login': z.object({
    userId: z.string(),
    timestamp: z.number(),
  }),
  'payment.processed': z.object({
    paymentId: z.string(),
    amount: z.number(),
    method: z.enum(['card', 'paypal', 'crypto']),
  }),
});

// ============================================
// 1. Event Names Type Extraction
// ============================================

// Extract event name type
type MyEventNames = EventNames<typeof events>;
// Result: 'order.created' | 'user.login' | 'payment.processed'

const validEventName: MyEventNames = 'order.created'; // ✅ Valid
// const invalidEventName: MyEventNames = 'invalid.event'; // ❌ Type error

console.log('✅ Event names are narrowed to literal types');
console.log('   Valid event:', validEventName);

// ============================================
// 2. Payload Type Extraction
// ============================================

// Extract specific event payload type
type OrderPayload = EventPayload<typeof events, 'order.created'>;
// Result: { orderId: string; total: number; items: Array<{...}> }

const orderData: OrderPayload = {
  orderId: 'ORD-123',
  total: 99.99,
  items: [{ productId: 'PROD-1', quantity: 2 }],
};

console.log('✅ Payload types are fully inferred');
console.log('   Order data:', orderData);

// ============================================
// 3. Full Event Map Type
// ============================================

// Extract all event payloads as a mapped type
type AllEvents = EventMap<typeof events>;
// Result: {
//   'order.created': { orderId: string; ... };
//   'user.login': { userId: string; ... };
//   'payment.processed': { paymentId: string; ... };
// }

function handleEvent<E extends EventNames<typeof events>>(
  eventName: E,
  payload: AllEvents[E]
): void {
  console.log(`Handling event: ${eventName}`);
  console.log('Payload:', payload);
}

// ✅ Type-safe event handling with full inference
handleEvent('order.created', {
  orderId: 'ORD-456',
  total: 199.99,
  items: [{ productId: 'PROD-2', quantity: 1 }],
});

handleEvent('user.login', {
  userId: 'USER-789',
  timestamp: Date.now(),
});

// ❌ This would cause a type error (wrong payload shape):
// handleEvent('order.created', { userId: 'wrong' });

// ============================================
// 4. Generic Event Handler Pattern
// ============================================

// Create a type-safe event handler wrapper
class TypeSafeEventHandler<T extends typeof events> {
  constructor(private registry: T) {}

  on<E extends EventNames<T>>(
    eventName: E,
    handler: (payload: EventPayload<T, E>) => void
  ): void {
    // In real implementation, this would register the handler
    console.log(`Registered handler for: ${String(eventName)}`);
  }

  emit<E extends EventNames<T>>(
    eventName: E,
    payload: unknown
  ): void {
    // Validate before emitting
    const result = this.registry.validate(eventName, payload);
    if (result.success) {
      console.log(`Emitted: ${String(eventName)}`);
      // In real implementation, would call registered handlers
    } else {
      console.error(`Validation failed for ${String(eventName)}`);
    }
  }
}

const handler = new TypeSafeEventHandler(events);

// ✅ Full autocomplete on event names
handler.on('order.created', (payload) => {
  // payload is automatically typed as OrderPayload
  console.log('Order ID:', payload.orderId);
  console.log('Total:', payload.total);
  console.log('Items:', payload.items.length);
});

handler.on('user.login', (payload) => {
  // payload is automatically typed as UserLoginPayload
  console.log('User logged in:', payload.userId);
  console.log('At:', new Date(payload.timestamp));
});

// ============================================
// 5. Conditional Type Patterns
// ============================================

// Extract only events that contain a specific field
type EventsWithUserId<T extends EventMap<typeof events>> = {
  [K in keyof T]: T[K] extends { userId: string } ? K : never
}[keyof T];

type UserEvents = EventsWithUserId<AllEvents>;
// Result: 'user.login' (only events with userId field)

console.log('\n✅ Advanced type patterns work correctly');

// ============================================
// 6. Discriminated Union Pattern
// ============================================

// Create a discriminated union from all events
type EventWithType<T extends typeof events> = {
  [K in EventNames<T>]: {
    type: K;
    payload: EventPayload<T, K>;
  };
}[EventNames<T>];

function processEvent(event: EventWithType<typeof events>): void {
  switch (event.type) {
    case 'order.created':
      // event.payload is automatically narrowed to OrderPayload
      console.log('Processing order:', event.payload.orderId);
      break;
    case 'user.login':
      // event.payload is automatically narrowed to UserLoginPayload
      console.log('User logged in:', event.payload.userId);
      break;
    case 'payment.processed':
      // event.payload is automatically narrowed to PaymentPayload
      console.log('Payment processed:', event.payload.paymentId);
      break;
  }
}

processEvent({
  type: 'order.created',
  payload: {
    orderId: 'ORD-999',
    total: 299.99,
    items: [{ productId: 'PROD-3', quantity: 3 }],
  },
});

// ============================================
// 7. Type Narrowing with Validation
// ============================================

function validateAndProcess(
  eventName: string,
  payload: unknown
): void {
  // Runtime check
  if (events.hasEvent(eventName)) {
    // TypeScript narrows eventName to EventNames<typeof events>
    const result = events.validate(eventName, payload);
    
    if (result.success) {
      // result.data is properly typed
      console.log('Validated data:', result.data);
    }
  }
}

validateAndProcess('order.created', {
  orderId: 'ORD-111',
  total: 49.99,
  items: [],
});

console.log('\n=== Type Inference Demo Complete ===');
console.log('✅ All types are fully inferred');
console.log('✅ No "any" types used');
console.log('✅ Autocomplete works everywhere');
console.log('✅ Type narrowing is precise');
