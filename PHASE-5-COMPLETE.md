# Phase 5 Complete: Rooms & Targeted Messaging

✅ **Status**: Complete  
📅 **Completed**: April 23, 2026

## Objective Achieved

**Moved from demo → production usability** - Introduced scoped communication without exposing Socket.IO complexity. Now you can send events to specific users or groups instead of broadcasting to everyone.

---

## What Was Built

### Clean Abstraction Over Rooms

A production-ready room system that:
- ✅ Hides Socket.IO room complexity behind simple API
- ✅ Maintains full type safety and validation
- ✅ Provides flexible room naming conventions
- ✅ Prevents event leakage across users
- ✅ Offers both direct and fluent APIs

---

## API Design

### 1. **Join Room**
```typescript
server.joinRoom(socket.id, 'order:123');
server.joinRoom(socket.id, 'user:alice');
```

### 2. **Leave Room**
```typescript
server.leaveRoom(socket.id, 'order:123');
```

### 3. **Emit to Room - Direct API**
```typescript
server.emitToRoom('order:123', 'order.updated', {
  orderId: '123',
  status: 'completed'
});
```

### 4. **Emit to Room - Fluent API** (Better!)
```typescript
server.toRoom('order:123').emit('order.updated', {
  orderId: '123',
  status: 'completed'
});

// Clean for multiple emissions
const orderRoom = server.toRoom('order:123');
orderRoom.emit('order.updated', { orderId: '123', status: 'completed' });
orderRoom.emit('notification', { message: 'Order processed', type: 'success' });
```

---

## Problems Solved

### ✅ Room Naming Conventions

**Pattern**: `{type}:{id}`

```typescript
// User-specific rooms
'user:alice'
'user:bob'

// Resource-specific rooms
'order:123'
'document:456'
'chat:789'

// Hierarchical rooms
'user:alice:notifications'
'team:engineering:announcements'
```

### ✅ Prevent Event Leakage

**Before (Global Broadcast):**
```typescript
// ❌ Everyone sees this, even if it's not their order
io.emit('order.updated', { orderId: '123', status: 'completed' });
```

**After (Targeted):**
```typescript
// ✅ Only users who joined 'order:123' room see this
server.toRoom('order:123').emit('order.updated', {
  orderId: '123',
  status: 'completed'
});
```

### ✅ Simple But Flexible

**Simple for common cases:**
```typescript
// One-liner for targeted messaging
server.toRoom('user:alice').emit('notification', {
  message: 'Your order is ready!',
  type: 'success'
});
```

**Flexible for complex scenarios:**
```typescript
// Multiple rooms, dynamic subscriptions
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  // Personal room
  server.joinRoom(socket.id, `user:${userId}`);
  
  // Subscribe to resources
  socket.on('subscribe:order', (orderId) => {
    server.joinRoom(socket.id, `order:${orderId}`);
  });
  
  socket.on('unsubscribe:order', (orderId) => {
    server.leaveRoom(socket.id, `order:${orderId}`);
  });
});
```

### ✅ Type Safety Maintained

All the Phase 4 benefits still apply:
```typescript
// ✅ Event name autocompletes
server.toRoom('order:123').emit('order.updated', /* ... */);
                                 // ^ IDE suggests available events

// ✅ Payload type is inferred and validated
server.toRoom('order:123').emit('order.updated', {
  orderId: '123',
  status: 'completed' // ✅ Enum validated
});

// ❌ TypeScript error - unknown event
server.toRoom('order:123').emit('invalid.event', {});

// ❌ TypeScript error - wrong payload
server.toRoom('order:123').emit('order.updated', { wrong: 'data' });
```

---

## Real-World Use Cases

### 1. **User-Specific Notifications**
```typescript
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  server.joinRoom(socket.id, `user:${userId}`);
});

// Backend process
function notifyUser(userId: string, message: string) {
  server.toRoom(`user:${userId}`).emit('notification', {
    message,
    type: 'info',
    timestamp: Date.now()
  });
}
```

### 2. **Order Tracking**
```typescript
// Customer subscribes to order updates
socket.on('track:order', (orderId) => {
  server.joinRoom(socket.id, `order:${orderId}`);
});

// Backend updates order status
function updateOrder(orderId: string, status: string) {
  server.toRoom(`order:${orderId}`).emit('order.updated', {
    orderId,
    status,
    timestamp: Date.now()
  });
}
```

### 3. **Private Messaging**
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

### 4. **Resource Subscriptions**
```typescript
// Multiple users watching same document
function subscribeToDocument(socketId: string, docId: string) {
  server.joinRoom(socketId, `document:${docId}`);
}

// Notify all watchers when document changes
function notifyDocumentUpdate(docId: string, changes: any) {
  server.toRoom(`document:${docId}`).emit('resource.updated', {
    resourceType: 'document',
    resourceId: docId,
    changes
  });
}
```

### 5. **Temporary Rooms with Auto-Cleanup**
```typescript
function processOrder(socketId: string, orderId: string) {
  const room = `order:${orderId}`;
  
  // Subscribe
  server.joinRoom(socketId, room);
  
  // Send updates during processing
  server.toRoom(room).emit('order.updated', { orderId, status: 'processing' });
  
  // ... processing happens ...
  
  // Final update and unsubscribe
  server.toRoom(room).emit('order.updated', { orderId, status: 'completed' });
  server.leaveRoom(socketId, room);
}
```

---

## Files Changed

### @bolt-socket/server

#### `packages/server/src/types.ts`
**Added:**
- `RoomEmitter<T>` interface - Type-safe room emitter
- `joinRoom(socketId, roomName)` - Join socket to room
- `leaveRoom(socketId, roomName)` - Remove socket from room
- `emitToRoom(roomName, eventName, payload)` - Direct room emission
- `toRoom(roomName)` - Fluent API for room emissions

#### `packages/server/src/server.ts`
**Implemented:**
- Room joining/leaving logic with socket validation
- Room emission with full validation pipeline
- Fluent API via `RoomEmitter` object
- Error handling for missing sockets and unattached IO

### Examples

#### `examples/rooms-usage.ts` (NEW - 420 lines)
**Demonstrates:**
- User-specific notifications
- Order tracking and subscriptions
- Private messaging between users
- Resource subscriptions (documents, etc.)
- Room management patterns
- API comparison (direct vs fluent)
- Best practices and naming conventions

---

## API Comparison

### Direct API
**Good for:** Single emissions, simple cases
```typescript
server.emitToRoom('order:123', 'order.updated', {
  orderId: '123',
  status: 'completed'
});
```

### Fluent API
**Good for:** Multiple emissions, reusable references, cleaner code
```typescript
const orderRoom = server.toRoom('order:123');

orderRoom.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});

orderRoom.emit('notification', {
  message: 'Order completed',
  type: 'success'
});
```

---

## Best Practices

### 1. **Naming Conventions**
```typescript
// ✅ Good - Descriptive, namespaced
'user:123'
'order:abc-456'
'document:doc-789'
'chat:room-999'

// ❌ Bad - Ambiguous, collision-prone
'123'
'room1'
'test'
```

### 2. **Room Lifecycle**
```typescript
// ✅ Good - Clean up when done
function handleOrderComplete(socketId: string, orderId: string) {
  server.toRoom(`order:${orderId}`).emit('order.updated', {
    orderId,
    status: 'completed'
  });
  server.leaveRoom(socketId, `order:${orderId}`);
}

// ❌ Bad - Rooms accumulate, memory leak
function handleOrderComplete(socketId: string, orderId: string) {
  server.toRoom(`order:${orderId}`).emit('order.updated', {
    orderId,
    status: 'completed'
  });
  // Never leave room ❌
}
```

### 3. **Authorization**
```typescript
// ✅ Good - Validate before joining
socket.on('subscribe:order', async (orderId) => {
  const userId = socket.handshake.query.userId;
  const hasAccess = await checkOrderAccess(userId, orderId);
  
  if (hasAccess) {
    server.joinRoom(socket.id, `order:${orderId}`);
  } else {
    socket.emit('error', { message: 'Access denied' });
  }
});
```

### 4. **Bulk Operations**
```typescript
// ✅ Good - Efficient room-based
function notifyTeam(teamId: string, message: string) {
  server.toRoom(`team:${teamId}`).emit('notification', {
    message,
    type: 'info'
  });
}

// ❌ Bad - Inefficient per-user iteration
function notifyTeam(userIds: string[], message: string) {
  userIds.forEach(userId => {
    server.toRoom(`user:${userId}`).emit('notification', {
      message,
      type: 'info'
    });
  });
}
```

### 5. **Disconnect Cleanup**
```typescript
// ✅ Good - Socket.IO handles room cleanup automatically
io.on('connection', (socket) => {
  server.joinRoom(socket.id, `user:${socket.userId}`);
  
  socket.on('disconnect', () => {
    // No need to manually leave rooms
    // Socket.IO cleans up automatically
  });
});
```

---

## Output Delivered

✅ **Targeted Real-Time Updates**
- Events go only to intended recipients
- No more global broadcasts for user-specific data
- Scalable to thousands of rooms

✅ **Production Ready**
- Authorization patterns included
- Error handling for edge cases
- Memory-efficient room management

✅ **Simple But Powerful**
- Clean API that hides complexity
- Flexible enough for any use case
- Full type safety maintained

---

## Testing the Implementation

### 1. **Build the Package**
```bash
cd packages/server
bun run build
```

### 2. **Run the Example**
```bash
cd examples
bun run rooms-usage.ts
```

### 3. **Connect Clients** (in browser console)
```javascript
const socket = io('http://localhost:3000', {
  query: { userId: 'alice' }
});

socket.on('notification', (data) => {
  console.log('Notification:', data);
});

socket.on('order.updated', (data) => {
  console.log('Order updated:', data);
});
```

---

## What's Next?

The core functionality is complete. Potential enhancements:

### Phase 6 Ideas (Optional)
- **Middleware System** - Pre/post-emit hooks, logging, analytics
- **Connection State Management** - Track who's online, presence
- **Retry & Acknowledgments** - Reliable delivery patterns
- **Broadcasting Utilities** - Batch operations, filters
- **Performance Monitoring** - Metrics, health checks

### Integration Patterns
- **Express Integration** - Middleware helpers
- **Next.js Integration** - API routes + Socket.IO
- **Auth Integration** - JWT validation, session management
- **Database Integration** - Persist room memberships

---

## Summary

Phase 5 transforms BoltSocket from a demo project into a **production-ready real-time framework**. You now have:

1. ✅ **Type-safe rooms** - Full TypeScript inference
2. ✅ **Targeted messaging** - No more accidental broadcasts
3. ✅ **Clean API** - Simple for beginners, powerful for experts
4. ✅ **Real-world patterns** - User notifications, order tracking, private messaging
5. ✅ **Production ready** - Error handling, validation, documentation

**BoltSocket is now ready for real applications!** 🚀
