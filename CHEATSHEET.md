# BoltSocket - Quick Reference

## Installation

### Server
```bash
npm install @bolt-socket/core @bolt-socket/server zod socket.io
```

### React Client  
```bash
npm install @bolt-socket/react @bolt-socket/core socket.io-client zod
```

---

## 1. Define Events (Shared)

```typescript
// events.ts
import { z } from 'zod';
import { createEventRegistry } from '@bolt-socket/core';

export const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed', 'cancelled']),
  }),
});
```

---

## 2. Server Setup

```typescript
// server.ts
import { Server } from 'socket.io';
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';
import { events } from './events';

const io = new Server(httpServer);
const server = createSocketServer({ events, io });

// Type-safe emit
server.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});

// Rooms - targeted messaging
io.on('connection', (socket) => {
  // Join user to personal room
  const userId = socket.handshake.query.userId;
  server.joinRoom(socket.id, `user:${userId}`);
  
  // Subscribe to resources
  socket.on('subscribe:order', (orderId) => {
    server.joinRoom(socket.id, `order:${orderId}`);
  });
});

// Emit to specific room (direct API)
server.emitToRoom('order:123', 'order.updated', {
  orderId: '123',
  status: 'completed'
});

// Or use fluent API (cleaner)
server.toRoom('order:123').emit('order.updated', {
  orderId: '123',
  status: 'completed'
});
```

---

## 3. React Client

```tsx
// App.tsx
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
  useSocketEvent('order.updated', (data) => {
    console.log('Order', data.orderId, 'is now', data.status);
  });

  return <div>Monitoring orders...</div>;
}
```

---

## Key Features

✅ **Type Safety** - Full TypeScript inference  
✅ **Validation** - Automatic Zod validation  
✅ **Auto Cleanup** - Listeners removed on unmount  
✅ **Reconnection** - Events reattach automatically  
✅ **Zero Boilerplate** - Clean, simple API  
✅ **IDE Support** - Autocomplete, hover tooltips, refactoring  
✅ **Compile-time Errors** - Catch bugs before runtime  
✅ **Rooms & Targeting** - Scoped communication without complexity

---

## Room Patterns

### Personal Notifications
```typescript
// Join user to their room
server.joinRoom(socket.id, `user:${userId}`);

// Send to specific user
server.toRoom('user:alice').emit('notification', {
  message: 'Your order is ready!',
  type: 'success'
});
```

### Resource Subscriptions
```typescript
// Subscribe to order updates
server.joinRoom(socket.id, `order:${orderId}`);

// Notify all subscribers
server.toRoom('order:123').emit('order.updated', {
  orderId: '123',
  status: 'completed'
});
```

### Private Messaging
```typescript
// Send message to recipient
server.toRoom(`user:${recipientId}`).emit('message.private', {
  from: senderId,
  to: recipientId,
  content: 'Hello!'
});
```

---

## IDE Features

When using BoltSocket, your IDE provides:

- [examples/dx-showcase.ts](examples/dx-showcase.ts) - Developer experience demo

## 4. Authentication

### Server
```typescript
import { createSocketServer } from '@bolt-socket/server';

const server = createSocketServer({
  events,
  io,
  auth: async (socket) => {
    const token = socket.handshake.auth.token;
    const user = await verifyJWT(token);
    
    return {
      success: true,
      context: { userId: user.sub, email: user.email }
    };
  }
});

// Access user context
io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;
  console.log('User:', authSocket.auth.userId);
});
```

### React Client
```tsx
<SocketProvider
  url="http://localhost:3000"
  events={events}
  
  auth={async () => ({
    token: await getAuthToken()
  })}
  
  onAuthError={(error) => {
    console.error('Auth failed:', error.message);
    navigate('/login');
  }}
  
  onConnect={() => console.log('Connected')}
  onDisconnect={(reason) => console.log('Disconnected:', reason)}
>
  <App />
</SocketProvider>
```

---

## Completion Status

✅ Phase 1: Core Event System  
✅ Phase 2: Server Layer  
✅ Phase 3: React Layer  
✅ Phase 4: Developer Experience  
✅ Phase 5: Rooms & Targeted Messaging  
✅ Phase 6: Connection & Auth Management

**Ready for production use!** 🚀🔒
