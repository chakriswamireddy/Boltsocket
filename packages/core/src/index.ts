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
