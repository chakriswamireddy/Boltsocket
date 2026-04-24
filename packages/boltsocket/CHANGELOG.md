# Changelog

## [1.0.1] - 2026-04-24

### Changed

- **Breaking improvement:** Moved `zod` from peer dependency to regular dependency
- Now `zod` installs automatically - users don't need to install it separately
- Simplified installation: just `npm install @bolt-socket/boltsocket`
- `socket.io`, `socket.io-client`, and `react` remain optional peer dependencies

## [1.0.0] - 2026-04-24

### Added

- Initial release with unified package structure
- Core: Type-safe event registry with Zod validation
- Server: Socket.IO server abstraction with rooms, auth, and event replay
- React: Hooks and provider for real-time WebSocket events
- Subpath exports for `boltsocket/core`, `boltsocket/server`, and `boltsocket/react`
