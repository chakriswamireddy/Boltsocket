# @bolt-socket/core Changelog

## [1.0.0] — 2026-04-24

### Added
- `createEventRegistry(schema)` — type-safe event registry with Zod validation
- `EventRegistry<T>` interface: `validate`, `parse`, `hasEvent`, `getEventNames`, `getSchema`, `getSchemaMap`
- Utility types: `EventSchema`, `EventNames<T>`, `EventPayload<T, E>`, `EventMap<T>`, `ExtractEvent<T, E>`, `ValidationResult<T>`
- Error classes: `EventRegistryError`, `UnknownEventError`, `ValidationError`, `InvalidSchemaError`
- Structured logger: `enableDebugLogs()`, `disableDebugLogs()`, `getLogHistory()`, `clearLogHistory()`
- Event tracer: `enableEventTracing()`, `disableEventTracing()`, `getEventTraces()`, `getFailedEventTraces()`, `onEventTraced()`, `clearEventTraces()`
- Reliability protocol types: `ReconnectOptions`, `EventReplayEntry`, `ReplayOptions`, `ReliabilityOptions`, `BOLT_EVENTS`
- Dual CJS + ESM build with declaration maps and source maps
