import { z } from 'zod';

/**
 * Event schema definition — maps event names to Zod schemas.
 *
 * @example
 * ```ts
 * const schema = {
 *   'order.updated': z.object({ orderId: z.string() }),
 *   'user.connected': z.object({ userId: z.string() })
 * } satisfies EventSchema;
 * ```
 */
export type EventSchema = Record<string, z.ZodType<any, any, any>>;

/**
 * Strict, readonly variant of EventSchema for use with `as const satisfies`.
 *
 * @example
 * ```ts
 * const schema = {
 *   'order.updated': z.object({ orderId: z.string() })
 * } as const satisfies StrictEventSchema;
 * ```
 */
export type StrictEventSchema = Readonly<Record<string, z.ZodType<any, any, any>>>;

/**
 * Extract event names from a schema as a string literal union.
 * Enables autocomplete and type narrowing in IDEs.
 *
 * @example
 * ```ts
 * type MyEvents = EventNames<typeof schema>;
 * // Result: 'order.updated' | 'user.connected'
 * ```
 */
export type EventNames<T extends EventSchema> = keyof T & string;

/**
 * Infer the payload type for a specific event from its schema.
 * Provides full TypeScript inference for event payloads.
 *
 * @example
 * ```ts
 * type OrderPayload = EventPayload<typeof schema, 'order.updated'>;
 * // Result: { orderId: string; status: string }
 * ```
 */
export type EventPayload<
  T extends EventSchema,
  E extends EventNames<T>
> = z.infer<T[E]>;

/**
 * Maps each event name to its inferred payload type.
 *
 * @example
 * ```ts
 * type AllEvents = EventMap<typeof schema>;
 * // Result: {
 * //   'order.updated': { orderId: string },
 * //   'user.connected': { userId: string }
 * // }
 * ```
 */
export type EventMap<T extends EventSchema> = {
  [K in EventNames<T>]: EventPayload<T, K>;
};

/**
 * Convenience alias for extracting a specific event payload.
 *
 * @example
 * ```ts
 * type OrderEvent = ExtractEvent<typeof schema, 'order.updated'>;
 * ```
 */
export type ExtractEvent<
  T extends EventSchema,
  E extends EventNames<T>
> = EventPayload<T, E>;

/**
 * Discriminated union for validation results.
 * Enables type-safe error handling without throwing.
 *
 * @example
 * ```ts
 * const result = registry.validate('order.updated', data);
 * if (result.success) {
 *   console.log(result.data.orderId); // Typed!
 * } else {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * Type-safe event registry interface.
 * All methods provide full TypeScript inference and IDE autocomplete.
 *
 * @template T - Event schema type
 *
 * @example
 * ```ts
 * const registry = createEventRegistry(schema);
 *
 * // ✅ Autocomplete suggests event names
 * const schema = registry.getSchema('order.updated');
 *
 * // ✅ Payload type is inferred
 * const result = registry.validate('order.updated', data);
 * ```
 */
export interface EventRegistry<T extends EventSchema> {
  /**
   * Get the Zod schema for a specific event.
   *
   * @param eventName - Event name (autocompletes in IDE)
   * @throws {UnknownEventError} If event doesn't exist
   */
  getSchema<E extends EventNames<T>>(eventName: E): T[E];

  /**
   * Validate a payload against its event schema (non-throwing).
   *
   * @param eventName - Event name
   * @param payload   - Data to validate
   * @returns Discriminated union: success with typed data or failure with error
   */
  validate<E extends EventNames<T>>(
    eventName: E,
    payload: unknown
  ): ValidationResult<EventPayload<T, E>>;

  /**
   * Parse and validate a payload, throwing on failure.
   *
   * @param eventName - Event name
   * @param payload   - Data to validate
   * @throws {ValidationError} If validation fails
   * @throws {UnknownEventError} If event doesn't exist
   */
  parse<E extends EventNames<T>>(
    eventName: E,
    payload: unknown
  ): EventPayload<T, E>;

  /**
   * Type guard that checks whether an event name exists in the registry.
   * Narrows the type of `eventName` to `EventNames<T>` on truthy branch.
   */
  hasEvent(eventName: string): eventName is EventNames<T>;

  /**
   * Get all registered event names as an array.
   */
  getEventNames(): EventNames<T>[];

  /**
   * Get the raw schema object (readonly).
   */
  getSchemaMap(): Readonly<T>;
}
