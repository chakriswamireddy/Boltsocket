# Changelog

All notable changes to bolt-socket are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-04-24

First stable release. All nine implementation phases are complete.

### Packages

- `@bolt-socket/core` 1.0.0
- `@bolt-socket/server` 1.0.0
- `@bolt-socket/react` 1.0.0

---

### Phase 1 — Core Event System

- `createEventRegistry(schema)` — creates a typed event registry backed by Zod schemas
- `EventRegistry<T>` interface: `validate`, `parse`, `hasEvent`, `getEventNames`, `getSchema`, `getSchemaMap`
- `ValidationResult<T>` discriminated union for safe, exception-free validation
- `EventSchema`, `EventNames<T>`, `EventPayload<T, E>`, `EventMap<T>`, `ExtractEvent<T, E>` utility types
- Custom error hierarchy: `EventRegistryError`, `UnknownEventError`, `ValidationError`, `InvalidSchemaError`

### Phase 2 — Server Layer

- `createSocketServer(options)` — thin wrapper around `socket.io` `Server`
- Type-safe `emit(eventName, payload)` — validates payload via Zod before Socket.IO dispatch
- `SocketServerOptions<T>`, `SocketServer<T>`, `AuthContext`, `AuthMiddleware`, `AuthResult`

### Phase 3 — React Layer

- `<SocketProvider>` — manages the Socket.IO connection lifecycle
- `useSocket()` — access `{ socket, isConnected, connectionId }`
- `useSocketEvent(name, handler)` — type-safe event subscription with automatic cleanup
- `useSocketEventOnce(name, handler)` — one-shot subscription

### Phase 4 — Developer Experience

- Full TypeScript inference end-to-end (event names, payloads, handler signatures)
- Stale-closure prevention via `useRef` callback storage
- No duplicate listener registration (previous listener removed before re-subscription)

### Phase 5 — Rooms & Targeted Messaging

- `server.toRoom(name)` — fluent `RoomEmitter` API
- `server.emitToRoom(room, eventName, payload)` — direct room broadcast
- `server.joinRoom(socketId, roomName)` / `server.leaveRoom(socketId, roomName)`

### Phase 6 — Connection & Auth Management

- `auth` option on `createSocketServer` — async middleware called on every connection
- `AuthenticatedSocket` — extends `Socket` with `.auth` typed context
- `auth` prop on `<SocketProvider>` — called on every connect/reconnect for token refresh
- `onAuthError`, `onReconnectAttempt`, `onReconnectFailed` callbacks
- Multi-tab awareness; token refresh flow documented

### Phase 7 — Reliability Layer

- `reconnect` prop on `<SocketProvider>` — maps to Socket.IO reconnection options
- `syncOnReconnect` prop — triggers `bolt:sync` protocol after successful reconnect
- `useReconnect(callback)` — fires after each successful reconnect
- `useReconnectCallback` — alias for `useReconnect`
- `useConnectionStatus()` — tracks `reconnectCount`, `lastConnectedAt`, `lastDisconnectedAt`
- `useEventReplay(options)` — receives `bolt:replay` / `bolt:replay:done` events
- `reliability.replay` option on `createSocketServer` — configures `EventReplayBuffer`
- `EventReplayBuffer` — circular, TTL-evicting buffer; exported from `@bolt-socket/server`
- `server.onClientReconnect(handler)` — fires when a previously-seen session reconnects
- `server.replayEventsTo(socketId, since, rooms?)` — manual replay trigger
- `server.getReplayBuffer()` — access the live buffer instance
- `BOLT_EVENTS` constant: `SESSION`, `SYNC`, `REPLAY`, `REPLAY_DONE`
- Internal bolt session protocol: `bolt:session` sent on connect; `bolt:sync` sent by client on reconnect

### Phase 8 — Observability & Debugging

- Structured singleton logger (`BoltSocketLogger`) — silent by default, activated by `enableDebugLogs()`
- `LogLevel`: `debug | info | warn | error | silent`
- `LogCategory`: `connection | auth | event | validation | room | replay | reliability`
- `enableDebugLogs(options?)` — activates console output and in-memory history
- `disableDebugLogs()` — silences output; history preserved
- `getLogHistory()` / `clearLogHistory()` — access the ring-buffer history
- `BoltLoggerOptions`: `level`, `categories`, `onLog`, `prefix`, `maxHistory`
- Singleton event tracer (`BoltSocketTracer`) — activated by `enableEventTracing()`
- `EventTrace`: `id`, `eventName`, `direction`, `payload`, `timestamp`, `validated`, `validationError`, `room`, `socketId`, `durationMs`
- `enableEventTracing(options?)` / `disableEventTracing()`
- `getEventTraces()` / `getEventTracesByName(name)` / `getFailedEventTraces()` / `clearEventTraces()`
- `onEventTraced(callback)` — subscribe to live trace events
- `useDebugLogs(options)` — React hook for live log panel
- `useEventTraces(options)` — React hook for live trace panel
- `useDevMode()` — combines both hooks; returns `{ logs, traces }`
- All hooks return helpers: `filterByCategory`, `filterByLevel`, `forEvent`, `failedTraces`
- `useSocketEvent` now records inbound traces and measures `durationMs` via `performance.now()`

### Phase 9 — Packaging & Distribution

- Dual CJS + ESM output via `tsup` (`format: ['cjs', 'esm']`)
- Full TypeScript declaration files (`.d.ts` + `.d.mts`) with source maps
- `exports` map in all `package.json` files with nested `import`/`require`/`types` conditions
- `sideEffects: false` on all packages — enables dead-code elimination in consumer bundlers
- `publishConfig.access: "public"` on all packages
- `files` array: only `dist/` and `README.md` published to npm
- `pnpm-workspace.yaml` for monorepo workspace protocol support
- `tsconfig.base.json` with `composite: true`, `incremental: true`, `declarationMap: true`, `strict: true`
- Root scripts: `build`, `build:core/server/react`, `dev:*`, `typecheck`, `clean`, `publish:all`, `publish:dry`
- `engines` field: Node.js ≥ 18, pnpm ≥ 8

---

[1.0.0]: https://github.com/chakriswamireddy/Boltsocket/releases/tag/v1.0.0
