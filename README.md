# bolt-socket

Full-stack, type-safe WebSocket abstraction for real-time applications built on Socket.IO and Zod.

## Packages

| Package | Version | Description |
|---|---|---|
| [`@bolt-socket/core`](packages/core) | 1.0.0 | Event registry, validation, logger, tracer |
| [`@bolt-socket/server`](packages/server) | 1.0.0 | Socket.IO server abstraction with auth + replay |
| [`@bolt-socket/react`](packages/react) | 1.0.0 | React hooks and provider |

## Features

- **Type-safe events** — a single schema definition drives TypeScript inference on both client and server
- **Runtime validation** — Zod validates every payload before emit or dispatch
- **Auth middleware** — JWT / session validation with per-socket context
- **Rooms & targeting** — fluent `toRoom(name).emit(event, payload)` API
- **Reliability** — automatic reconnection, missed-event replay, `onReconnect` hook
- **Observability** — structured logger + event tracer, silent by default, zero bundle cost when disabled

## Installation

### Server

```bash
pnpm add @bolt-socket/core @bolt-socket/server zod socket.io
# or: npm install / yarn add
```

### React client

```bash
pnpm add @bolt-socket/react @bolt-socket/core socket.io-client zod react
```

---

## Quick Start

### 1. Define events (shared between client and server)

```ts
// src/events.ts
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

export const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']),
  }),
  'chat.message': z.object({
    roomId: z.string(),
    text: z.string().max(2000),
    authorId: z.string(),
  }),
  notification: z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'warning', 'error']),
  }),
});

export type AppEvents = typeof events;
```

### 2. Server setup

```ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createSocketServer } from '@bolt-socket/server';
import { events } from './events';

const http = createServer();
const io = new Server(http, { cors: { origin: '*' } });

const server = createSocketServer({
  events,
  io,
  // Optional auth middleware (Phase 6)
  auth: async (socket) => {
    const token = socket.handshake.auth.token;
    const user = await verifyJWT(token);           // your function
    return { success: true, context: { userId: user.sub, role: user.role } };
  },
  // Optional reliability / replay (Phase 7)
  reliability: {
    replay: { enabled: true, bufferSize: 500, ttlMs: 30_000 },
  },
});

// Type-safe broadcast
server.emit('notification', { message: 'Server started', type: 'info' });

// Room-scoped emit
server.toRoom('order:123').emit('order.updated', {
  orderId: '123',
  status: 'shipped',
});

// Reconnect hook — called for every client that reconnects
server.onClientReconnect((socket, missedEvents) => {
  console.log(`Socket ${socket.id} reconnected; replaying ${missedEvents.length} events`);
});

http.listen(3001);
```

### 3. React client

```tsx
// src/App.tsx
import { SocketProvider, useSocketEvent, useSocket } from '@bolt-socket/react';
import { events } from './events';

export function App() {
  return (
    <SocketProvider
      url="http://localhost:3001"
      events={events}
      auth={async () => ({ token: await getAuthToken() })}
      reconnect={{ maxAttempts: 10, delay: 1000, maxDelay: 30_000 }}
      syncOnReconnect                         // replay missed events after reconnect
      onConnect={() => console.log('connected')}
      onDisconnect={() => console.log('disconnected')}
      onReconnect={(attempt) => console.log('reconnected after attempt', attempt)}
      onAuthError={(err) => navigate('/login')}
    >
      <Dashboard />
    </SocketProvider>
  );
}

function Dashboard() {
  const { socket, isConnected } = useSocket();

  // Type-safe listener — auto-cleaned up on unmount
  useSocketEvent('order.updated', (data) => {
    // data: { orderId: string; status: 'pending' | 'shipped' | ... }
    console.log('Order', data.orderId, '→', data.status);
  });

  const sendMessage = () => {
    socket?.emit('chat.message', {
      roomId: 'general',
      text: 'Hello!',
      authorId: 'me',
    });
  };

  return (
    <div>
      <span>{isConnected ? 'Online' : 'Offline'}</span>
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

---

## API Reference

### `@bolt-socket/core`

#### `createEventRegistry(schema)`

Creates a type-safe event registry backed by Zod schemas.

```ts
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

const events = createEventRegistry({
  'user.joined': z.object({ userId: z.string(), name: z.string() }),
});

events.validate('user.joined', { userId: '1', name: 'Alice' }); // { success: true, data: ... }
events.parse('user.joined', payload);                           // throws on invalid
events.hasEvent('user.joined');                                 // true
events.getEventNames();                                         // ['user.joined']
events.getSchema('user.joined');                                // ZodObject
events.getSchemaMap();                                          // Readonly<T>
```

#### Types

```ts
import type {
  EventSchema,          // Record<string, ZodType>
  EventNames<T>,        // keyof T & string
  EventPayload<T, E>,   // z.infer<T[E]>
  EventMap<T>,          // { [K in EventNames<T>]: EventPayload<T, K> }
  ExtractEvent<T, E>,   // alias for EventPayload
  ValidationResult<T>,  // { success: true; data: T } | { success: false; error: ZodError }
  EventRegistry<T>,     // return type of createEventRegistry
} from '@bolt-socket/core';
```

#### Errors

```ts
import { EventRegistryError, UnknownEventError, ValidationError, InvalidSchemaError } from '@bolt-socket/core';

try {
  events.parse('unknown', {});
} catch (err) {
  if (err instanceof UnknownEventError) {
    console.log(err.eventName); // 'unknown'
  }
}
```

#### Observability — Logger (Phase 8)

Silent by default. Call once during startup to activate.

```ts
import { enableDebugLogs, disableDebugLogs, getLogHistory, clearLogHistory } from '@bolt-socket/core';
import type { LogLevel, LogCategory, LogEntry, BoltLoggerOptions } from '@bolt-socket/core';

// Full debug output
enableDebugLogs();

// Targeted — only connection and auth, forwarded to Datadog
enableDebugLogs({
  level: 'info',
  categories: ['connection', 'auth'],
  onLog: (entry: LogEntry) => datadogLogs.logger.log(entry.message, entry.data),
  prefix: '[MyApp]',
  maxHistory: 1000,
});

disableDebugLogs();

const logs = getLogHistory();        // LogEntry[]
clearLogHistory();
```

**Log categories:** `connection` | `auth` | `event` | `validation` | `room` | `replay` | `reliability`

#### Observability — Tracer (Phase 8)

```ts
import {
  enableEventTracing, disableEventTracing,
  getEventTraces, getEventTracesByName, getFailedEventTraces,
  onEventTraced, clearEventTraces,
} from '@bolt-socket/core';
import type { EventTrace, EventTracerOptions } from '@bolt-socket/core';

enableEventTracing({ maxTraces: 200 });

onEventTraced((trace: EventTrace) => {
  if (!trace.validated) {
    reportToSentry(trace.validationError, trace.eventName);
  }
});

const allTraces = getEventTraces();
const failed   = getFailedEventTraces();
const specific = getEventTracesByName('order.updated');

disableEventTracing();
clearEventTraces();
```

**`EventTrace` shape:**
```ts
interface EventTrace {
  id: number;
  eventName: string;
  direction: 'inbound' | 'outbound';
  payload: unknown;
  timestamp: number;       // Date.now()
  validated: boolean;
  validationError?: string;
  room?: string;
  socketId?: string;
  durationMs?: number;     // time from event received to handler complete
}
```

#### Reliability types (Phase 7)

```ts
import type { ReconnectOptions, EventReplayEntry, ReplayOptions, ReliabilityOptions } from '@bolt-socket/core';
import { BOLT_EVENTS } from '@bolt-socket/core';

// BOLT_EVENTS.SESSION | .SYNC | .REPLAY | .REPLAY_DONE
```

---

### `@bolt-socket/server`

#### `createSocketServer(options)`

```ts
import { createSocketServer } from '@bolt-socket/server';
import type {
  SocketServerOptions,
  SocketServer,
  RoomEmitter,
  AuthContext,
  AuthenticatedSocket,
  AuthResult,
  AuthMiddleware,
} from '@bolt-socket/server';

const server: SocketServer<typeof events> = createSocketServer({
  events,
  io,

  // Auth (Phase 6)
  auth: async (socket): Promise<AuthResult> => {
    const user = await verifyToken(socket.handshake.auth.token);
    return { success: true, context: { userId: user.id } };
  },

  // Reliability (Phase 7)
  reliability: {
    replay: {
      enabled: true,
      bufferSize: 500,   // max events to buffer (default 200)
      ttlMs: 30_000,     // event TTL in ms (default 60_000)
    },
  },
});
```

**`SocketServer<T>` interface:**

```ts
// Broadcast to all connected clients
server.emit(eventName, payload);

// Fluent room API
server.toRoom('room:id').emit(eventName, payload);
server.emitToRoom('room:id', eventName, payload);

// Room management
server.joinRoom(socketId, roomName);
server.leaveRoom(socketId, roomName);

// Auth context (after Phase 6 auth middleware)
const socket = io.sockets.sockets.get(socketId) as AuthenticatedSocket;
console.log(socket.auth.userId);

// Reliability (Phase 7)
server.onClientReconnect((socket, missedEvents) => { ... });
server.replayEventsTo(socketId, sinceTimestamp, rooms?);
server.getReplayBuffer();  // EventReplayBuffer | undefined
```

#### `EventReplayBuffer`

```ts
import { EventReplayBuffer } from '@bolt-socket/server';

const buffer = new EventReplayBuffer({ bufferSize: 500, ttlMs: 30_000 });
buffer.add({ eventName: 'order.updated', payload: { ... }, timestamp: Date.now() });
buffer.getEventsSince(timestamp, ['room:1']);
buffer.size();
buffer.clear();
```

---

### `@bolt-socket/react`

#### `<SocketProvider>`

```tsx
import { SocketProvider } from '@bolt-socket/react';
import type { SocketProviderProps } from '@bolt-socket/react';

<SocketProvider
  url="http://localhost:3001"      // required
  events={events}                  // required — EventRegistry<T>
  auth={async () => ({ token })}   // optional — called on every connect/reconnect
  reconnect={{                     // optional (Phase 7)
    maxAttempts: 10,
    delay: 1000,
    maxDelay: 30_000,
    randomization: 0.5,
  }}
  syncOnReconnect                  // optional — send bolt:sync after reconnect
  onConnect={() => {}}
  onDisconnect={() => {}}
  onReconnect={(attempt) => {}}
  onReconnectAttempt={(attempt) => {}}
  onReconnectFailed={() => {}}
  onAuthError={(error) => {}}
  onError={(error) => {}}
>
  {children}
</SocketProvider>
```

#### `useSocket()`

```ts
const { socket, isConnected, connectionId } = useSocket();
```

#### `useSocketEvent(eventName, handler, options?)`

Subscribes to a type-safe event. Listener is auto-removed on unmount.

```ts
useSocketEvent('order.updated', (data) => {
  // data is fully typed: { orderId: string; status: ... }
  setOrder(data);
});

// One-time listener
useSocketEventOnce('notification', (data) => {
  alert(data.message);
});
```

#### Reliability hooks (Phase 7)

```ts
import { useReconnect, useConnectionStatus, useEventReplay } from '@bolt-socket/react';
import type { ConnectionStatus, UseEventReplayOptions } from '@bolt-socket/react';

// Fire callback after every successful reconnect
useReconnect(() => {
  refetchCriticalData();
});

// Track connection state
const status: ConnectionStatus = useConnectionStatus();
// { reconnectCount, lastConnectedAt, lastDisconnectedAt }

// Receive missed events replayed by the server
useEventReplay({
  onReplay: (entries) => {
    entries.forEach(entry => applyReplayedEvent(entry));
  },
  onReplayDone: () => {
    setReplayComplete(true);
  },
});
```

#### Observability hooks (Phase 8)

```ts
import { useDebugLogs, useEventTraces, useDevMode } from '@bolt-socket/react';
import type {
  UseDebugLogsOptions, UseDebugLogsResult,
  UseEventTracesOptions, UseEventTracesResult,
} from '@bolt-socket/react';

// Live log panel
function LogPanel() {
  const { logs, filterByCategory, filterByLevel } = useDebugLogs({ maxEntries: 100 });
  const connectionLogs = filterByCategory('connection');
  return <pre>{JSON.stringify(connectionLogs, null, 2)}</pre>;
}

// Live trace panel
function TracePanel() {
  const { traces, failedTraces, forEvent } = useEventTraces({ maxEntries: 50 });
  return <pre>{JSON.stringify(failedTraces, null, 2)}</pre>;
}

// Both combined
const { logs, traces } = useDevMode();
```

---

## Reliability Protocol (Phase 7)

BoltSocket uses a lightweight session/sync protocol over Socket.IO to replay missed events after reconnection.

```
Client connects
  └── Server → bolt:session  { sessionId, connectedAt }

Client reconnects
  └── Client → bolt:sync     { lastConnectedAt, rooms[] }
  └── Server → bolt:replay   (one per missed event)  ×N
  └── Server → bolt:replay:done
```

The server maintains an in-memory circular `EventReplayBuffer` (configurable size + TTL). On reconnect, missed events are streamed back in chronological order. The buffer is per-server-process — for multi-process deployments, pair with a Redis adapter.

---

## Observability Reference (Phase 8)

All BoltSocket packages share a single logger singleton and tracer singleton from `@bolt-socket/core`. Both are **silent by default** — calling `enableDebugLogs()` / `enableEventTracing()` activates them. Because the call paths are dead code when disabled, consumer bundlers will tree-shake them out of production builds.

```
enableDebugLogs()      → activates console output + history (logger)
enableEventTracing()   → activates in-memory EventTrace ring buffer (tracer)
```

Use `useDebugLogs` / `useEventTraces` / `useDevMode` in React to render live diagnostic panels in development.

---

## Bundle Size

All packages are built with `tsup` (esbuild) with `treeshake: true` and `sideEffects: false`. Peer dependencies are never bundled.

| Package | Minified + gzip (approx.) |
|---|---|
| `@bolt-socket/core` | ~3 kB |
| `@bolt-socket/server` | ~4 kB |
| `@bolt-socket/react` | ~5 kB |

Zod, Socket.IO, and React are peer dependencies and not counted.

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build individual packages
pnpm build:core
pnpm build:server
pnpm build:react

# Type-check all packages
pnpm typecheck

# Watch mode during development
pnpm dev:core
pnpm dev:server
pnpm dev:react

# Clean all build artifacts
pnpm clean
```

### Publishing

```bash
# Dry-run — verifies what would be published
pnpm publish:dry

# Publish all packages
pnpm publish:all
```

---

## Requirements

- Node.js ≥ 18.0.0
- pnpm ≥ 8.0.0
- Peer: `zod` ≥ 3.0.0
- Peer: `socket.io` ≥ 4.6.0 (server)
- Peer: `socket.io-client` ≥ 4.6.0 (client)
- Peer: `react` ≥ 18.0.0

## License

MIT
