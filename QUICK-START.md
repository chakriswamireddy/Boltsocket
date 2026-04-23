# Quick Start Guide

Get started with bolt-socket in 5 minutes.

## Installation

```bash
# From project root
npm install

# Build the core package
cd packages/core
npm run build
```

## Your First Event Registry

Create a file `my-events.ts`:

```typescript
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

// Define your events
export const events = createEventRegistry({
  // User events
  'user.login': z.object({
    userId: z.string(),
    email: z.string().email(),
    timestamp: z.number(),
  }),
  
  'user.logout': z.object({
    userId: z.string(),
    timestamp: z.number(),
  }),

  // Order events
  'order.created': z.object({
    orderId: z.string(),
    userId: z.string(),
    total: z.number().positive(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })).min(1),
  }),

  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
    updatedAt: z.number(),
  }),

  // Notification events
  'notification.sent': z.object({
    notificationId: z.string(),
    userId: z.string(),
    type: z.enum(['email', 'sms', 'push']),
    message: z.string().max(500),
  }),
});
```

## Validating Events

```typescript
import { events } from './my-events';

// Validate user login
const loginData = {
  userId: 'user-123',
  email: 'user@example.com',
  timestamp: Date.now(),
};

const result = events.validate('user.login', loginData);

if (result.success) {
  console.log('Valid login:', result.data);
  // result.data is fully typed with autocomplete
} else {
  console.error('Validation failed:', result.error.issues);
}
```

## Type-Safe Event Handling

```typescript
import { events } from './my-events';
import type { EventNames, EventPayload } from '@bolt-socket/core';

// Get event name types
type MyEventNames = EventNames<typeof events>;
// 'user.login' | 'user.logout' | 'order.created' | ...

// Get specific payload type
type LoginPayload = EventPayload<typeof events, 'user.login'>;
// { userId: string; email: string; timestamp: number }

// Type-safe event handler
function handleEvent<E extends MyEventNames>(
  eventName: E,
  payload: EventPayload<typeof events, E>
): void {
  console.log(`Event: ${eventName}`, payload);
  // payload is correctly typed based on eventName
}

// Usage with full type safety
handleEvent('user.login', {
  userId: 'user-123',
  email: 'user@example.com',
  timestamp: Date.now(),
}); // ✅ Type-safe

// This would cause a TypeScript error:
// handleEvent('user.login', { userId: 'user-123' }); // ❌ Missing fields
```

## Error Handling

```typescript
import { events } from './my-events';
import { ValidationError, UnknownEventError } from '@bolt-socket/core';

// Using parse (throws on error)
try {
  const data = events.parse('order.created', {
    orderId: 'order-456',
    userId: 'user-789',
    total: 99.99,
    items: [
      { productId: 'prod-1', quantity: 2, price: 49.99 }
    ],
  });
  
  console.log('Order validated:', data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof UnknownEventError) {
    console.error('Unknown event:', error.message);
  }
}
```

## Advanced: Custom Event Emitter

```typescript
import { events } from './my-events';
import type { EventNames, EventPayload } from '@bolt-socket/core';

class TypeSafeEmitter {
  private handlers = new Map<string, Function[]>();

  on<E extends EventNames<typeof events>>(
    eventName: E,
    handler: (payload: EventPayload<typeof events, E>) => void
  ): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  emit<E extends EventNames<typeof events>>(
    eventName: E,
    payload: unknown
  ): void {
    // Validate before emitting
    const result = events.validate(eventName, payload);
    
    if (!result.success) {
      throw new Error(`Invalid payload for ${eventName}`);
    }

    const handlers = this.handlers.get(eventName) || [];
    handlers.forEach(handler => handler(result.data));
  }
}

// Usage
const emitter = new TypeSafeEmitter();

emitter.on('user.login', (data) => {
  // data is typed as LoginPayload
  console.log('User logged in:', data.userId);
  console.log('Email:', data.email);
});

emitter.emit('user.login', {
  userId: 'user-999',
  email: 'test@example.com',
  timestamp: Date.now(),
});
```

## Run Examples

```bash
# See complete examples
cd examples
npm run example:all

# Or run individually
npm run example:basic
npm run example:edge-cases
npm run example:types
```

## Next Steps

- ✅ Phase 1 (Core) - **You are here**
- 🔜 Phase 2 (Server) - Socket.io integration
- 🔜 Phase 3 (React) - React hooks

## Tips

1. **Start simple**: Define a few events, validate them, see it work
2. **Use TypeScript**: The type inference is the killer feature
3. **Check examples**: Real patterns for common use cases
4. **Read errors**: Zod gives detailed validation errors
5. **Build incrementally**: Add events as you need them

## Common Patterns

### Pattern 1: Shared Events File
```typescript
// events.ts - Single source of truth
export const events = createEventRegistry({ /* ... */ });
export type AppEvents = typeof events;
```

### Pattern 2: Event Type Exports
```typescript
// types.ts
import type { EventPayload } from '@bolt-socket/core';
import type { events } from './events';

export type LoginPayload = EventPayload<typeof events, 'user.login'>;
export type OrderPayload = EventPayload<typeof events, 'order.created'>;
```

### Pattern 3: Validation Middleware
```typescript
function validateEventMiddleware(eventName: string, payload: unknown) {
  const result = events.validate(eventName as any, payload);
  if (!result.success) {
    throw new Error(`Invalid ${eventName}: ${result.error.message}`);
  }
  return result.data;
}
```

## Need Help?

- Check [examples/](examples/) for comprehensive examples
- Read [PHASE-1-COMPLETE.md](PHASE-1-COMPLETE.md) for architecture details
- Review [packages/core/README.md](packages/core/README.md) for API docs

---

**Ready to build?** Phase 1 gives you everything needed for type-safe event handling. Phase 2 will add Socket.io integration!
