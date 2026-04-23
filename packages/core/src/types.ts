import { z } from 'zod';

/**
 * Event schema definition - maps event names to Zod schemas
 * 
 * @example
 * ```ts
 * const schema = {
 *   'order.updated': z.object({ orderId: z.string() }),
 *   'user.connected': z.object({ userId: z.string() })
 * } as const satisfies EventSchema;
 * ```
 */
export type EventSchema = Record<string, z.ZodType<any, any, any>>;
 Provides full TypeScript inference for event payloads
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
 * Type-safe event map with inferred payloads
 * Maps each event name to its inferred payload type
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
 * Extract specific event payload by name
 * Utility type for convenience
 * 
 * @example
 * ```ts
 * type OrderEvent = ExtractEvent<typeof schema, 'order.updated'>;
 * ```
 */
export type ExtractEvent<
  T extends EventSchema,
  E extends EventNames<T>
> = EventPayload<T, E>*/
export type StrictEventSchema = Readonly<Record<string, z.ZodType<any, any, any>>>;

/**
 * Extract event names from schema as a string literal union
 * This enables autocomplete in IDE
 * 
 * @example
 * ```ts
 * type MyEvents = EventNames<typeof schema>;
 * // Result: 'order.updated' | 'user.connected'
 * ```
 */
export type EventNames<T extends EventSchema> = keyof T & string;

/**
 * Infer payload type from a specific event schema
 */
export type EventPayload<
  T extends EventSchema,
  E extends EventNames<T>
> = z.infer<T[E]>;

/**
 * Type-safe event map with inferred payloads
 */
export type EventMap<T extends EventSchema> = {
  [K in EventNames<T>]: EventPayload<T, K>;
};

/**
 * Event validation result
 * Discriminated union for type-safe error handling
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
 * Event registry interface with type-safe methods
 * All methods provide full TypeScript inference and autocomplete
 * 
 * @template T - Event schema type with string keys and Zod schemas
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
   * Get the Zod schema for a specific event
   * 
   * @param eventName - Event name (autocompletes in IDE)
   * @returns Zod schema for the event
   * @throws {UnknownEventError} If event doesn't exist
   * 
   * @example
   * ```ts
   * const schema = registry.getSchema('order.updated');
   * const isValid = schema.safeParse(data).success;
   * ```
   */
  getSchema<E extends EventNames<T>>(eventName: E): T[E];

  /**
   * Validate an event payload against its schema (non-throwing)
   * 
   * @param eventName - Event name (autocompletes in IDE)
   * @param payload - Data to validate
   * @returns ValidationResult with typed data or error
   * 
   * @example
   * ```ts
   * const result = registry.validate('order.updated', data);
   * if (result.success) {
   *   // result.data is fully typed
   *   console.log(result.data.orderId);
   * }
   * ```
   */
  validate<E extends EventNames<T>>(
    eventName: E,
    payload: unknown
  ): ValidationResult<EventPayload<T, E>>;

  /**
   * Parse and validate an event payload (throws on error)
   * 
   * @param eventName - Event name (autocompletes in IDE)
   * @param payload - Data to validate
   * @returns Validated and typed payload
   * @throws {ValidationError} If validation fails
   * @throws {UnknownEventError} If event doesn't exist
   * 
   * @example
   * ```ts
   * try {
   *   const data = registry.parse('order.updated', input);
   *   // data is fully typed
   * } catch (error) {
   *   console.error('Invalid payload');
   * }
   * ```
   */
  parse<E extends EventNames<T>>(
    eventName: E,
    payload: unknown
  ): EventPayload<T, E>;

  /**
   * Check if an event name exists in the registry (type guard)
   * 
   * @param eventName - Event name to check
   * @returns True if event exists (narrows type)
   * 
   * @example
   * ```ts
   * if (registry.hasEvent(name)) {
   *   // name is narrowed to EventNames<T>
   *   registry.getSchema(name);
   * }
   * ```
   */
  hasEvent(eventName: string): eventName is EventNames<T>;

  /**
   * Get all registered event names as an array
   * 
   * @returns Array of event name strings
   * 
   * @example
   * ```ts
   * const events = registry.getEventNames();
   * // ['order.updated', 'user.connected']
   * ```
   */
  getEventNames(): EventNames<T>[];

  /**
   * Get the raw schema object (readonly)
   * 
   * @returns Readonly schema map
   * 
   * @example
   * ```ts
   * const schemas = registry.getSchemaMap();
   * const orderSchema = schemas['order.updated'];
   * ```
   */
  getSchemaMap(): Readonly<T>;
}
