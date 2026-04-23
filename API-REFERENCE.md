# BoltSocket API Reference

Complete API reference for all packages.

## Installation

### Core (Required for all)
```bash
npm install @bolt-socket/core zod
```

### Server
```bash
npm install @bolt-socket/server socket.io
```

### React Client
```bash
npm install @bolt-socket/react socket.io-client react
```

## Core API (Phase 1)

### `createEventRegistry<T>(schema)`

Creates a type-safe event registry with runtime validation.

**Parameters:**
- `schema: EventSchema` - Object mapping event names to Zod schemas

**Returns:** `EventRegistry<T>`

**Example:**
```typescript
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed'])
  }),
  'user.connected': z.object({
    userId: z.string()
  })
});
```

### `EventRegistry<T>` Interface

#### `getSchema<E>(eventName: E): Schema`
Get the Zod schema for a specific event.

```typescript
const schema = events.getSchema('order.updated');
```

#### `validate<E>(eventName: E, payload: unknown): ValidationResult<T>`
Validate a payload without throwing errors.

```typescript
const result = events.validate('order.updated', {
  orderId: '123',
  status: 'completed'
});

if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error);
}
```

#### `parse<E>(eventName: E, payload: unknown): T`
Validate a payload and throw on error.

```typescript
try {
  const data = events.parse('order.updated', payload);
} catch (error) {
  console.error('Validation failed:', error);
}
```

#### `hasEvent(eventName: string): boolean`
Check if an event exists in the registry.

```typescript
if (events.hasEvent('order.updated')) {
  // Event exists
}
```

#### `getEventNames(): string[]`
Get all registered event names.

```typescript
const names = events.getEventNames();
// ['order.updated', 'user.connected']
```@bolt-socket/server)

### Installation

```bash
npm install @bolt-socket/server @bolt-socket/core socket.io zod
```

### `createSocketServer<T>(options)`

Creates a typed Socket.IO server wrapper with validation.

**Parameters:**
- `options.events: EventRegistry<T>` - Required. The event registry to use
- `options.io?: Server` - Optional. Existing Socket.IO server instance

**Returns:** `SocketServer<T>`

**Example:**
```typescript
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server
Creates a typed Socket.IO server wrapper with validation.

**Parameters:**
- `options.events: EventRegistry<T>` - Required. The event registry to use
- `options.io?: Server` - Optional. Existing Socket.IO server instance

**Returns:** `SocketServer<T>`

**Example:**
```typescript
import { createSocketServer } from '@bolt-socket/core';
import { Server } from 'socket.io';

const io = new Server(httpServer);
const server = createSocketServer({ events, io });
```

### `SocketServer<T>` Interface

#### `emit<E>(eventName: E, payload: T): void`
Emit a validated event to all connected clients.

**Throws:**
- `UnknownEventError` - Event not in registry
- `ValidationError` - Payload validation failed
- `Error` - Socket.IO server not attached

```typescript
// ✅ Type-safe with autocomplete
server.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});

// ❌ Compile error - unknown event
server.emit('invalid.event', {});

// ❌ Runtime error - validation failed
server.emit('order.updated', {
  orderId: 123, // Wrong type
  status: 'invalid' // Invalid enum value
});
```

#### `attach(io: Server): void`
Attach to an existing Socket.IO server.

```typescript
const server = createSocketServer({ events });
// Later...
server.attach(io);
```

#### `getIO(): Server | undefined`
Get the underlying Socket.IO server instance.

```typescript
const io = server.getIO();
if (io) {
  console.log('Clients:', io.sockets.sockets.size);
}
```

#### `getRegistry(): EventRegistry<T>`
Get the event registry used by this server.

```typescript
const registry = server.getRegistry();
const eventNames = registry.getEventNames();
```

#### `joinRoom(socketId: string, roomName: string): void`
Join a socket to a room for targeted messaging.

**Throws:**
- `Error` - Socket.IO server not attached or socket not found

```typescript
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  // Join user to their personal room
  server.joinRoom(socket.id, `user:${userId}`);
  
  // Subscribe to order updates
  server.joinRoom(socket.id, `order:${orderId}`);
});
```

#### `leaveRoom(socketId: string, roomName: string): void`
Remove a socket from a room.

**Throws:**
- `Error` - Socket.IO server not attached or socket not found

```typescript
// Unsubscribe from order updates
server.leaveRoom(socket.id, `order:${orderId}`);
```

#### `emitToRoom<E>(roomName: string, eventName: E, payload: T): void`
Emit a typed event to a specific room only.

**Throws:**
- `UnknownEventError` - Event not in registry
- `ValidationError` - Payload validation failed
- `Error` - Socket.IO server not attached

```typescript
// Only users in 'order:123' room will receive this
server.emitToRoom('order:123', 'order.updated', {
  orderId: '123',
  status: 'completed'
});
```

#### `toRoom(roomName: string): RoomEmitter<T>`
Get a room emitter for fluent API. Returns a scoped emitter for cleaner code when sending multiple events to the same room.

```typescript
// Fluent API - cleaner for multiple emissions
const orderRoom = server.toRoom('order:123');

orderRoom.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});

orderRoom.emit('notification', {
  message: 'Order processed',
  type: 'success'
});
```

### `RoomEmitter<T>` Interface

#### `emit<E>(eventName: E, payload: T): void`
Emit a typed event to the room.

**Throws:**
- `UnknownEventError` - Event not in registry
- `ValidationError` - Payload validation failed

```typescript
roomEmitter.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});
```

---

## Rooms & Targeted Messaging (Phase 5)

### Room Naming Conventions

Use descriptive patterns for room names:

```typescript
// User-specific rooms
'user:{userId}'          // Personal notifications
'user:alice'

// Resource-specific rooms
'order:{orderId}'        // Order updates
'document:{docId}'       // Document changes
'chat:{chatId}'          // Chat messages

// Hierarchical rooms
'team:{teamId}:announcements'
'project:{projectId}:activity'
```

### Common Patterns

#### Pattern 1: Personal Notifications
```typescript
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  server.joinRoom(socket.id, `user:${userId}`);
});

// Send notification to specific user
function notifyUser(userId: string, message: string) {
  server.toRoom(`user:${userId}`).emit('notification', {
    message,
    type: 'info',
    timestamp: Date.now()
  });
}
```

#### Pattern 2: Resource Subscriptions
```typescript
// Client subscribes to resource
socket.on('subscribe:order', (orderId) => {
  server.joinRoom(socket.id, `order:${orderId}`);
});

// Backend updates resource
function updateOrder(orderId: string, status: string) {
  server.toRoom(`order:${orderId}`).emit('order.updated', {
    orderId,
    status,
    timestamp: Date.now()
  });
}
```

#### Pattern 3: Temporary Rooms
```typescript
function processOrder(socketId: string, orderId: string) {
  const room = `order:${orderId}`;
  
  // Subscribe for updates
  server.joinRoom(socketId, room);
  
  // Send processing updates
  server.toRoom(room).emit('order.updated', {
    orderId,
    status: 'processing'
  });
  
  // ... processing ...
  
  // Final update and cleanup
  server.toRoom(room).emit('order.updated', {
    orderId,
    status: 'completed'
  });
  server.leaveRoom(socketId, room);
}
```

#### Pattern 4: Private Messaging
```typescript
function sendPrivateMessage(fromId: string, toId: string, content: string) {
  server.toRoom(`user:${toId}`).emit('message.private', {
    from: fromId,
    to: toId,
    content,
    timestamp: Date.now()
  });
}
```

### Best Practices for Rooms

1. **Use descriptive names**: `user:123` not just `123`
2. **Validate access**: Check permissions before joining rooms
3. **Clean up**: Leave rooms when no longer needed
4. **Use fluent API**: For multiple emissions to same room
5. **Handle disconnects**: Socket.IO auto-cleans rooms on disconnect

```typescript
// ✅ Good
io.on('connection', (socket) => {
  socket.on('subscribe:order', async (orderId) => {
    // Validate access
    const hasAccess = await checkAccess(socket.userId, orderId);
    if (hasAccess) {
      server.joinRoom(socket.id, `order:${orderId}`);
    }
  });
});

// ❌ Bad - No validation
io.on('connection', (socket) => {
  socket.on('subscribe:order', (orderId) => {
    server.joinRoom(socket.id, `order:${orderId}`); // Anyone can join!
  });
});
```

---

## Type Utilities

### `EventNames<T>`
Extract event names as a union type.

```typescript
type MyEvents = EventNames<typeof mySchema>;
// 'order.updated' | 'user.connected'
```

### `EventPayload<T, E>`
Infer the payload type for a specific event.

```typescript
type OrderPayload = EventPayload<typeof mySchema, 'order.updated'>;
// { orderId: string; status: 'pending' | 'completed' }
```

### `EventMap<T>`
Map of all events to their payload types.

```typescript
type MyEventMap = EventMap<typeof mySchema>;
// {
//   'order.updated': { orderId: string; status: ... },
//   'user.connected': { userId: string }
// }
```

### `ValidationResult<T>`
Result type for validation operations.

```typescript
type Result =
  | { success: true; data: T }
  | { success: false; error: ZodError };
```

---

## Error Classes

### `EventRegistryError`
Base error class for all event registry errors.

### `UnknownEventError`
Thrown when referencing a non-existent event.

```typescript
try {
  events.getSchema('unknown');
} catch (error) {
  if (error instanceof UnknownEventError) {
    console.error('Event not found');
  }
}
```

### `ValidationError`
Thrown when payload validation fails.

```typescript
try {
  server.emit('order.updated', invalidPayload);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid payload:', error.message);
  }
}
```

### `InvalidSchemaError`
Thrown when schema definition is invalid.

```typescript
try {
  createEventRegistry({
    '': z.string(), // Invalid empty name
  });
} catch (error) {
  if (error instanceof InvalidSchemaError) {
    console.error('Invalid schema:', error.message);
  }
}
```

---

## Complete Example

```typescript
import { createEventRegistry, createSocketServer } from '@bolt-socket/core';
import { Server } from 'socket.io';
import { z } from 'zod';
import { createServer } from 'http';

// 1. Define events
const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed', 'cancelled']),
    timestamp: z.number(),
  }),
  'user.connected': z.object({
    userId: z.string(),
    username: z.string(),
  }),
});

// 2. Create HTTP & Socket.IO server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// 3. Create typed socket server
const server = createSocketServer({ events, io });

// 4. Emit events (type-safe & validated)
function notifyOrderUpdate(orderId: string, status: string) {
  server.emit('order.updated', {
    orderId,
    status: status as any,
    timestamp: Date.now(),
  });
}

// 5. Handle connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  server.emit('user.connected', {
    userId: socket.id,
    username: 'anonymous',
  });
});

// 6. Start server
httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Best Practices

### 1. Define Events Centrally
Create one registry and share it across your application.

```typescript
// events.ts
export const events = createEventRegistry({ ... });

// server.ts
import { events } from './events';
const server = createSocketServer({ events });

// client.ts (future)
import { events } from './events';
```

### 2. Use Descriptive Event Names
Follow a consistent naming pattern: `resource.action`

```typescript
'order.created'
'order.updated'
'order.deleted'
'user.connected'
'user.disconnected'
```

### 3. Validate Early
Let the server handle validation - don't duplicate validation logic.

```typescript
// ✅ Good - let server validate
server.emit('order.updated', userInput);

// ❌ Bad - manual validation
if (typeof userInput.orderId === 'string') {
  server.emit('order.updated', userInput);
}
```

### 4. Handle Errors Gracefully
Always catch validation errors in production.

```typescript
try {
  server.emit('order.updated', payload);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.error('Invalid payload:', error.message);
    // Handle error appropriately
  }
}
```

---

## React API (@bolt-socket/react)

### Installation

```bash
npm install @bolt-socket/react @bolt-socket/core socket.io-client zod react
```

### `<SocketProvider>`

React context provider that manages the Socket.IO connection lifecycle.

**Props:**
- `url: string` - Socket.IO server URL
- `events: EventRegistry<T>` - Event registry for validation
- `auth?: object | () => object | Promise<object>` - Optional authentication data or provider
- `options?: SocketIOClientOptions` - Additional Socket.IO client options
- `children: ReactNode` - Child components

**Example:**
```tsx
import { SocketProvider } from '@bolt-socket/react';
import { events } from './events';

function App() {
  const [token, setToken] = useState('abc123');

  return (
    <SocketProvider 
      url="http://localhost:3000"
      events={events}
      auth={{ token }}
    >
      <YourApp />
    </SocketProvider>
  );
}
```

**With async auth provider:**
```tsx
<SocketProvider 
  url="http://localhost:3000"
  events={events}
  auth={async () => {
    const token = await getAuthToken();
    return { token };
  }}
>
  <YourApp />
</SocketProvider>
```

### `useSocketEvent(eventName, handler, deps?)`

Subscribe to a typed socket event with automatic cleanup.

**Parameters:**
- `eventName: E` - Type-safe event name from registry
- `handler: (payload: T) => void` - Callback with typed payload
- `deps?: React.DependencyList` - Optional dependency array (like useEffect)

**Returns:** `void`

**Features:**
- ✅ Automatic cleanup on unmount
- ✅ Reattaches listener after reconnection
- ✅ Prevents stale closures
- ✅ Validates payload before calling handler
- ✅ Type-safe event names and payloads

**Example:**
```tsx
import { useSocketEvent } from '@bolt-socket/react';
import { useState } from 'react';

function OrderStatus({ orderId }) {
  const [status, setStatus] = useState('pending');

  // ✅ Type-safe with autocomplete
  useSocketEvent('order.updated', (data) => {
    if (data.orderId === orderId) {
      setStatus(data.status);
    }
  });

  return <div>Status: {status}</div>;
}
```

**With dependencies:**
```tsx
function OrderFilter() {
  const [userId, setUserId] = useState('user-123');
  const [orders, setOrders] = useState([]);

  // Resubscribe when userId changes
  useSocketEvent('order.updated', (data) => {
    if (data.userId === userId) {
      setOrders(prev => [...prev, data]);
    }
  }, [userId]);

  return <div>{/* ... */}</div>;
}
```

### `useSocketEventOnce(eventName, handler)`

Subscribe to an event that fires only once.

**Parameters:**
- `eventName: E` - Type-safe event name from registry
- `handler: (payload: T) => void` - Callback with typed payload

**Returns:** `void`

**Example:**
```tsx
function WelcomeMessage() {
  const [message, setMessage] = useState('');

  useSocketEventOnce('welcome', (data) => {
    setMessage(data.message);
  });

  return <div>{message}</div>;
}
```

### `useSocket()`

Access the raw Socket.IO socket instance.

**Returns:** `Socket | null`

**Example:**
```tsx
import { useSocket } from '@bolt-socket/react';

function DebugPanel() {
  const socket = useSocket();

  if (!socket) {
    return <div>Not connected</div>;
  }

  return (
    <div>
      <p>Socket ID: {socket.id}</p>
      <p>Connected: {socket.connected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

---

## Complete Full-Stack Example

### 1. Define Shared Events

```typescript
// events.ts (shared between client and server)
import { z } from 'zod';
import { createEventRegistry } from '@bolt-socket/core';

export const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed']),
    timestamp: z.number(),
  }),
  'notification': z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'error']),
  }),
});
```

### 2. Server Setup

```typescript
// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createSocketServer } from '@bolt-socket/server';
import { events } from './events';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const socketServer = createSocketServer({ events, io });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send welcome notification
  socketServer.emit('notification', {
    message: 'Welcome to the app!',
    type: 'info',
  });
});

httpServer.listen(3000);
```

### 3. React Client

```tsx
// App.tsx
import { SocketProvider, useSocketEvent } from '@bolt-socket/react';
import { events } from './events';
import { useState } from 'react';

function OrderMonitor() {
  const [latestOrder, setLatestOrder] = useState(null);

  useSocketEvent('order.updated', (data) => {
    console.log('Order updated:', data);
    setLatestOrder(data);
  });

  return (
    <div>
      {latestOrder && (
        <div>
          <p>Order: {latestOrder.orderId}</p>
          <p>Status: {latestOrder.status}</p>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <SocketProvider url="http://localhost:3000" events={events}>
      <h1>Real-time Order Tracking</h1>
      <OrderMonitor />
    </SocketProvider>
  );
}

export default App;
```

---

## Best Practices

### 1. Define Events Centrally
Create one registry and share it across your application.

```typescript
// events.ts
export const events = createEventRegistry({ ... });

// server.ts
import { events } from './events';
import { createSocketServer } from '@bolt-socket/server';
const server = createSocketServer({ events });

// App.tsx
import { events } from './events';
<SocketProvider events={events}>...</SocketProvider>
```

### 2. Use Descriptive Event Names
Follow a consistent naming pattern: `resource.action`

```typescript
'order.created'
'order.updated'
'order.deleted'
'user.connected'
'user.disconnected'
```

### 3. Validate Early
Let the framework handle validation - don't duplicate logic.

```typescript
// ✅ Good - framework validates automatically
server.emit('order.updated', userInput);
useSocketEvent('order.updated', (data) => {
  // data is already validated
});

// ❌ Bad - manual validation
if (typeof userInput.orderId === 'string') {
  server.emit('order.updated', userInput);
}
```

### 4. Handle Errors Gracefully
Always catch validation errors in production.

```typescript
try {
  server.emit('order.updated', payload);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.error('Invalid payload:', error.message);
  }
}
```

### 5. Use Dependency Arrays
Update listeners when relevant state changes.

```tsx
const [filter, setFilter] = useState('all');

useSocketEvent('order.updated', (data) => {
  if (filter === 'all' || data.status === filter) {
    // Handle event
  }
}, [filter]); // Resubscribe when filter changes
```

---

## Package Structure
 with clean separation:

- `@bolt-socket/core` - Event registry and validation (required for all)
- `@bolt-socket/server` - Socket.IO server abstraction (backend only)
- `@bolt-socket/react` - React hooks and provider (frontend only) layer
- `@bolt-socket/react` - React hooks and provider

All packages maintain type compatibility for seamless integration.
