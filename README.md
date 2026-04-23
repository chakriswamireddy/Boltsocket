# bolt-socket

Full-stack WebSocket abstraction for MERN apps with type-safe event system.

## Features

- 🔒 **Type-safe events** - Full TypeScript inference from event schemas
- ✅ **Runtime validation** - Zod-powered payload validation
- 🎯 **Zero boilerplate** - Clean API with strong DX
- 🔄 **Frontend-backend sync** - Single source of truth for events

## Packages

- `@bolt-socket/core` - Event registry and validation
- `@bolt-socket/server` - Socket.IO server abstraction
- `@bolt-socket/react` - React hooks and provider

## Development Status

✅ **Phase 1: Core Event System** (Complete)  
✅ **Phase 2: Server Layer** (Complete)  
✅ **Phase 3: React Layer** (Complete)  
✅ **Phase 4: Developer Experience** (Complete)  
✅ **Phase 5: Rooms & Targeted Messaging** (Complete)  
✅ **Phase 6: Connection & Auth Management** (Complete)

## Installation

### Server
```bash
npm install @bolt-socket/core @bolt-socket/server zod socket.io
```

### React Client
```bash
npm install @bolt-socket/react @bolt-socket/core socket.io-client zod react
```

## Quick Start

### 1. Define Your Events (Shared)

```typescript
// events.ts (shared between client and server)
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

export const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed', 'cancelled'])
  }),
  'notification': z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'error'])
  })
});
```

### 2. Server Setup

```typescript
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';
import { Server } from 'socket.io';
import { events } from './events';

const io = new Server(httpServer);
const server = createSocketServer({ events, io });

// ✅ Type-safe emit with validation
server.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});
```

### 3. React Client

```tsx
import { SocketProvider, useSocketEvent } from '@bolt-socket/react';
import { events } from './events';

function App() {
  return (
    <SocketProvider url="http://localhost:3000" events={events}>
      <OrderMonitor />
    </SocketProvider>
  );
}

function OrderMonitor() {
  const [status, setStatus] = useState('pending');

  // ✅ Type-safe listener with auto-cleanup
  useSocketEvent('order.updated', (data) => {
    console.log('Order', data.orderId, 'is now', data.status);
    setStatus(data.status);
  });

  return <div>Status: {status}</div>;
}
```

### 4. Rooms & Targeted Messaging

```typescript
// Server: Join users to rooms
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  // User joins their personal room
  server.joinRoom(socket.id, `user:${userId}`);
  
  // Subscribe to specific resources
  server.joinRoom(socket.id, `order:${orderId}`);
});

// Send to specific room (direct API)
server.emitToRoom('order:123', 'order.updated', {
  orderId: '123',
  status: 'completed'
});

// Or use fluent API (cleaner for multiple emissions)
const orderRoom = server.toRoom('order:123');
orderRoom.emit('order.updated', { orderId: '123', status: 'completed' });
orderRoom.emit('notification', { message: 'Order ready', type: 'success' });

// Private messaging
server.toRoom('user:alice').emit('notification', {
  message: 'Your order is ready!',
  type: 'success'
});
```

### 5. Connection & Auth Management

```typescript
// Server: Secure connections with JWT validation
const server = createSocketServer({
  events,
  io,
  auth: async (socket) => {
    const token = socket.handshake.auth.token;
    const user = await verifyJWT(token);
    
    return {
      success: true,
      context: {
        userId: user.sub,
        email: user.email,
        role: user.role
      }
    };
  }
});

// Access authenticated user context
io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;
  console.log('User:', authSocket.auth.email);
  
  server.joinRoom(socket.id, `user:${authSocket.auth.userId}`);
});
```

```tsx
// Client: Auth with token refresh and error handling
<SocketProvider
  url="http://localhost:3000"
  events={events}
  
  auth={async () => ({
    token: await getAuthToken()  // Called on every reconnect
  })}
  
  onConnect={() => console.log('Connected!')}
  
  onAuthError={(error) => {
    // Token invalid - redirect to login
    localStorage.removeItem('token');
    navigate('/login');
  }}
  
  onReconnectAttempt={(attempt) => {
    console.log(`Reconnecting... attempt ${attempt}`);
  }}
>
  <App />
</SocketProvider>
```

## Features in Action

### Server Side
- 🔒 **Full TypeScript inference** - Event names and payloads autocomplete
- ✅ **Automatic validation** - Zod validates before emit
- 💡 **IDE tooltips** - Hover shows payload shape
- 🔄 **Refactoring support** - Rename events safely
- 🎯 **Targeted messaging** - Rooms for scoped communication
- 🔐 **Secure auth** - JWT validation with user context

### React Client
- 🎯 **Zero boilerplate** - Clean hooks API
- 🔄 **Automatic cleanup** - Listeners removed on unmount
- 🔌 **Reconnection handling** - Events reattach after disconnect
- 🚫 **No duplicate listeners** - Smart subscription management
- ⚡ **Stale closure prevention** - Always uses latest callback
- 💡 **Full IntelliSense** - Autocomplete everywhere
- 🔐 **Auth management** - Token refresh, error handling, multi-tab support

## Complete Example

See [examples/react-integration.tsx](examples/react-integration.tsx) for a full working example with Express + React.

### DX Showcase

Want to see the developer experience in action? Check out [examples/dx-showcase.ts](examples/dx-showcase.ts) which demonstrates:
- Event name autocomplete
- Payload type inference
- IDE hover tooltips
- Compile-time error detection
- Safe refactoring

## License

MIT
