# BoltSocket

Type-safe WebSocket abstraction with Zod validation for real-time apps.

## Installation

**Basic installation** (includes core functionality + Zod):
```bash
npm install @bolt-socket/boltsocket
```

**For server features**, also install:
```bash
npm install socket.io
```

**For React features**, also install:
```bash
npm install socket.io-client react
```

## Subpath Exports

This package provides three subpath exports:

### Core (`boltsocket/core`)

Type-safe event registry with Zod validation.

```typescript
import { createEventRegistry } from "boltsocket/core";
import { z } from "zod";

const events = createEventRegistry({
  "chat:message": z.object({
    message: z.string(),
    userId: z.string(),
  }),
});
```

### Server (`boltsocket/server`)

Socket.IO server with validation, rooms, auth, and event replay.

```typescript
import { createSocketServer } from "boltsocket/server";

const io = createSocketServer(httpServer, events, {
  onConnection: (socket) => {
    console.log("Connected:", socket.id);
  },
});
```

### React (`boltsocket/react`)

React hooks and provider for WebSocket events.

```tsx
import { SocketProvider, useSocketEvent } from "boltsocket/react";

function App() {
  return (
    <SocketProvider url="http://localhost:3000" registry={events}>
      <Chat />
    </SocketProvider>
  );
}

function Chat() {
  useSocketEvent(events, "chat:message", (data) => {
    console.log(data.message);
  });

  return <div>Chat App</div>;
}
```

## Dependencies

- **Included automatically:** `zod` (always installed)
- **Optional (install if needed):**
  - `socket.io` - for server features
  - `socket.io-client` - for client/React features
  - `react` - for React hooks

Install only what you need for your use case!

## License

MIT
