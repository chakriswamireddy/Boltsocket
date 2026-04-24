# @bolt-socket/react Changelog

## [1.0.0] — 2026-04-24

### Added
- `<SocketProvider>` — manages Socket.IO connection lifecycle with auth, reconnect, and sync support
- `useSocket()` — access `{ socket, isConnected, connectionId }`
- `useSocketEvent(name, handler)` — type-safe event subscription with automatic cleanup and stale-closure prevention
- `useSocketEventOnce(name, handler)` — one-shot subscription
- `useReconnect(callback)` / `useReconnectCallback` — fires after each successful reconnect
- `useConnectionStatus()` — tracks `reconnectCount`, `lastConnectedAt`, `lastDisconnectedAt`
- `useEventReplay(options)` — receives replayed events from server after reconnect
- `useDebugLogs(options)` — live log panel hook
- `useEventTraces(options)` — live event trace panel hook
- `useDevMode()` — combines logs and traces for development dashboards
- Full TypeScript inference through to event handler signatures
- Dual CJS + ESM build targeting browser (ES2020, JSX automatic runtime)
