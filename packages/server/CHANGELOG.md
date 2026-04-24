# @bolt-socket/server Changelog

## [1.0.0] — 2026-04-24

### Added
- `createSocketServer(options)` — type-safe Socket.IO server wrapper
- Type-safe `emit(eventName, payload)` with Zod validation before dispatch
- Room management: `toRoom(name)`, `emitToRoom(room, name, payload)`, `joinRoom`, `leaveRoom`
- Auth middleware: `auth` option with typed per-socket context, `AuthenticatedSocket`
- Reliability: `reliability.replay` option, `EventReplayBuffer`, `onClientReconnect`, `replayEventsTo`, `getReplayBuffer`
- Structured logging and event tracing via shared `@bolt-socket/core` singletons
- Internal bolt session protocol: `bolt:session` on connect, `bolt:sync` / `bolt:replay` on reconnect
