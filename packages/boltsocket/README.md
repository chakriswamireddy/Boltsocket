# BoltSocket

Type-safe WebSocket abstraction with Zod validation for real-time apps.

## Installation

```bash
npm install boltsocket zod socket.io socket.io-client react
```

## Subpath Exports

This package provides three subpath exports:

### Core (`boltsocket/core`)

Type-safe event registry with Zod validation.

```typescript
import { createEventRegistry } from 'boltsocket/core';
import { z } from 'zod';

const events = createEventRegistry({
  'chat:message': z.object({
    message: z.string(),
    userId: z.string()
  })
});
```

### Server (`boltsocket/server`)

Socket.IO server with validation, rooms, auth, and event replay.

```typescript
import { createSocketServer } from 'boltsocket/server';

const io = createSocketServer(httpServer, events, {
  onConnection: (socket) => {
    console.log('Connected:', socket.id);
  }
});
```

### React (`boltsocket/react`)

React hooks and provider for WebSocket events.

```tsx
import { SocketProvider, useSocketEvent } from 'boltsocket/react';

function App() {
  return (
    <SocketProvider url="http://localhost:3000" registry={events}>
      <Chat />
    </SocketProvider>
  );
}

function Chat() {
  useSocketEvent(events, 'chat:message', (data) => {
    console.log(data.message);
  });
  
  return <div>Chat App</div>;
}
```

## Peer Dependencies

- Core: `zod`
- Server: `zod`, `socket.io` (optional)
- React: `zod`, `socket.io-client`, `react` (optional)

All peer dependencies except `zod` are optional, so you only need to install what you use.

## License

MIT
