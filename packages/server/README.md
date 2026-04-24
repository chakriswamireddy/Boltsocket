# @bolt-socket/server

Type-safe Socket.IO server wrapper with auth, rooms, and event replay.

## Installation

```bash
pnpm add @bolt-socket/core @bolt-socket/server zod socket.io
```

## Usage

```ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createSocketServer } from '@bolt-socket/server';
import { events } from './events'; // createEventRegistry(...)

const http = createServer();
const io = new Server(http);

const server = createSocketServer({
  events,
  io,

  // Auth middleware (optional)
  auth: async (socket) => {
    const user = await verifyToken(socket.handshake.auth.token);
    return { success: true, context: { userId: user.id } };
  },

  // Event replay on reconnect (optional)
  reliability: {
    replay: { enabled: true, bufferSize: 500, ttlMs: 30_000 },
  },
});

// Broadcast
server.emit('notification', { message: 'Hello', type: 'info' });

// Rooms
server.toRoom('order:123').emit('order.updated', { orderId: '123', status: 'shipped' });
server.joinRoom(socketId, 'order:123');
server.leaveRoom(socketId, 'order:123');

// Reconnect hook
server.onClientReconnect((socket, missedEvents) => {
  console.log(`Replaying ${missedEvents.length} missed events to ${socket.id}`);
});

http.listen(3001);
```

## License

MIT
