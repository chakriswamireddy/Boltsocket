/**
 * @bolt-socket/core
 *
 * Core event registry and type system for bolt-socket.
 * Provides type-safe event definitions with runtime validation.
 */

export { createEventRegistry } from './event-registry';
export type {
  EventSchema,
  StrictEventSchema,
  EventNames,
  EventPayload,
  EventMap,
  ExtractEvent,
  EventRegistry,
  ValidationResult,
} from './types';
export {
  EventRegistryError,
  UnknownEventError,
  ValidationError,
  InvalidSchemaError,
} from './errors';

// ── Phase 7: Reliability ──────────────────────────────────────────────────────
export type {
  ReconnectOptions,
  EventReplayEntry,
  ReplayOptions,
  ReliabilityOptions,
  BoltSessionPayload,
  BoltSyncPayload,
} from './reliability-types';
export { BOLT_EVENTS } from './reliability-types';

// ── Phase 8: Observability ────────────────────────────────────────────────────
export {
  logger,
  enableDebugLogs,
  disableDebugLogs,
  getLogHistory,
  clearLogHistory,
} from './logger';
export type {
  LogLevel,
  LogCategory,
  LogEntry,
  BoltLoggerOptions,
} from './logger';

export {
  tracer,
  enableEventTracing,
  disableEventTracing,
  getEventTraces,
  getEventTracesByName,
  getFailedEventTraces,
  onEventTraced,
  clearEventTraces,
} from './tracer';
export type {
  EventTrace,
  EventTracerOptions,
} from './tracer';
