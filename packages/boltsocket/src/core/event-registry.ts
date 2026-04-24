import { z } from 'zod';
import type {
  EventSchema,
  EventNames,
  EventPayload,
  EventRegistry,
  ValidationResult,
} from './types';
import {
  UnknownEventError,
  ValidationError,
  InvalidSchemaError,
} from './errors';

/**
 * Create a type-safe event registry
 * 
 * @example
 * ```ts
 * const events = createEventRegistry({
 *   'order.updated': z.object({
 *     orderId: z.string(),
 *     status: z.string()
 *   }),
 *   'user.connected': z.object({
 *     userId: z.string()
 *   })
 * });
 * 
 * // ✅ Full autocomplete on event names
 * events.getSchema('order.updated');
 * 
 * // ✅ Type-safe validation
 * const result = events.validate('order.updated', {
 *   orderId: '123',
 *   status: 'completed'
 * });
 * ```
 */
export function createEventRegistry<T extends EventSchema>(
  schema: T
): EventRegistry<T> {
  // Validate schema definition
  if (!schema || typeof schema !== 'object') {
    throw new InvalidSchemaError('root', 'Event schema must be a non-null object');
  }

  // Check for empty schema
  if (Object.keys(schema).length === 0) {
    throw new InvalidSchemaError('root', 'Event schema cannot be empty');
  }

  // Ensure all values are Zod schemas
  for (const [key, value] of Object.entries(schema)) {
    // Check for null/undefined
    if (!value) {
      throw new InvalidSchemaError(key, 'Schema cannot be null or undefined');
    }
    
    // Check for valid Zod schema (presence of _def is a Zod characteristic)
    if (typeof value !== 'object' || !('_def' in value)) {
      throw new InvalidSchemaError(key, 'Expected a Zod schema');
    }

    // Check for invalid event names
    if (typeof key !== 'string' || key.trim() === '') {
      throw new InvalidSchemaError(key, 'Event name must be a non-empty string');
    }
  }

  // Cache event names for performance
  const eventNames = Object.keys(schema) as EventNames<T>[];

  return {
    getSchema<E extends EventNames<T>>(eventName: E): T[E] {
      const eventSchema = schema[eventName];
      if (!eventSchema) {
        throw new UnknownEventError(String(eventName));
      }
      return eventSchema;
    },

    validate<E extends EventNames<T>>(
      eventName: E,
      payload: unknown
    ): ValidationResult<EventPayload<T, E>> {
      const eventSchema = schema[eventName];
      
      if (!eventSchema) {
        // Return error for unknown events
        return {
          success: false,
          error: new z.ZodError([
            {
              code: 'custom',
              path: [],
              message: `Unknown event: "${String(eventName)}"`,
            },
          ]),
        };
      }

      const result = eventSchema.safeParse(payload);
      
      if (result.success) {
        return {
          success: true,
          data: result.data as EventPayload<T, E>,
        };
      }
      
      return {
        success: false,
        error: result.error,
      };
    },

    parse<E extends EventNames<T>>(
      eventName: E,
      payload: unknown
    ): EventPayload<T, E> {
      const eventSchema = schema[eventName];
      
      if (!eventSchema) {
        throw new UnknownEventError(String(eventName));
      }

      try {
        return eventSchema.parse(payload) as EventPayload<T, E>;
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Format error message with detailed issues
          const issues = error.issues
            .map(issue => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
          throw new ValidationError(String(eventName), issues);
        }
        throw error;
      }
    },

    hasEvent(eventName: string): eventName is EventNames<T> {
      return eventName in schema;
    },

    getEventNames(): EventNames<T>[] {
      return [...eventNames];
    },

    getSchemaMap(): Readonly<T> {
      return schema;
    },
  };
}
