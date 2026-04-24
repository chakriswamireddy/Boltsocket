/**
 * @bolt-socket/core — Event Tracer
 *
 * Records inbound and outbound socket events with rich metadata for debugging.
 * Works in tandem with the logger but is stored separately so traces can be
 * inspected programmatically (not just printed to the console).
 *
 * @example
 * ```ts
 * import { enableDebugLogs, getEventTraces } from '@bolt-socket/core';
 *
 * enableDebugLogs();
 *
 * // After some events have flowed…
 * const traces = getEventTraces();
 * console.table(traces.map(t => ({
 *   event: t.eventName,
 *   dir: t.direction,
 *   ok: t.validated,
 *   ms: t.durationMs,
 * })));
 *
 * // Subscribe in real time
 * const off = onEventTraced((trace) => {
 *   if (!trace.validated) {
 *     console.warn('Validation failed!', trace.validationError);
 *   }
 * });
 * off(); // Unsubscribe
 * ```
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single captured event trace record.
 */
export interface EventTrace {
  /** Unique monotonic ID for correlation. */
  id: string;
  /** Event name as registered in the EventRegistry. */
  eventName: string;
  /** Direction relative to this process. */
  direction: 'inbound' | 'outbound';
  /** Raw payload (as received / as sent). */
  payload: unknown;
  /** Unix timestamp (ms) when the event was captured. */
  timestamp: number;
  /** Whether the payload passed schema validation. */
  validated: boolean;
  /** Validation error message when validated = false. */
  validationError?: string;
  /** Room name if the event was targeted to a room. */
  room?: string;
  /** Socket ID of the origin / destination. */
  socketId?: string;
  /** Round-trip or processing time in milliseconds, if measurable. */
  durationMs?: number;
}

/** Options for configuring the tracer. */
export interface EventTracerOptions {
  /**
   * Maximum number of traces to keep in memory.
   * Oldest traces are evicted when the limit is reached.
   * @default 500
   */
  maxTraces?: number;

  /**
   * When true, the tracer is active and records events.
   * Toggle this at runtime to pause/resume tracing.
   * @default false
   */
  enabled?: boolean;
}

// ─── Tracer class ─────────────────────────────────────────────────────────────

/**
 * Internal event tracer. Records structured traces for every inbound and
 * outbound event processed by BoltSocket packages.
 */
class BoltSocketTracer {
  private traces: EventTrace[] = [];
  private maxTraces: number = 500;
  private enabled: boolean = false;
  private subscribers: Array<(trace: EventTrace) => void> = [];
  private counter: number = 0;

  configure(options: EventTracerOptions): void {
    if (options.maxTraces !== undefined) this.maxTraces = options.maxTraces;
    if (options.enabled !== undefined) this.enabled = options.enabled;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record a trace entry. Returns the stored trace object.
   * No-ops silently when tracing is disabled.
   */
  trace(entry: Omit<EventTrace, 'id' | 'timestamp'>): EventTrace | null {
    if (!this.enabled) return null;

    const trace: EventTrace = {
      ...entry,
      id: `bs-${++this.counter}`,
      timestamp: Date.now(),
    };

    this.traces.push(trace);
    if (this.traces.length > this.maxTraces) {
      this.traces.shift();
    }

    // Notify real-time subscribers
    for (const sub of this.subscribers) {
      try {
        sub(trace);
      } catch {
        // subscribers must not crash the tracer
      }
    }

    return trace;
  }

  /** All stored traces, newest last. */
  getTraces(): EventTrace[] {
    return [...this.traces];
  }

  /** Filter traces by event name. */
  getTracesByEvent(eventName: string): EventTrace[] {
    return this.traces.filter(t => t.eventName === eventName);
  }

  /** Filter traces by direction. */
  getTracesByDirection(direction: 'inbound' | 'outbound'): EventTrace[] {
    return this.traces.filter(t => t.direction === direction);
  }

  /** Filter traces by validation outcome. */
  getFailedTraces(): EventTrace[] {
    return this.traces.filter(t => !t.validated);
  }

  /** Remove all stored traces. */
  clearTraces(): void {
    this.traces = [];
    this.counter = 0;
  }

  /**
   * Subscribe to traces as they are recorded.
   * @returns Unsubscribe function
   */
  onTrace(callback: (trace: EventTrace) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx !== -1) this.subscribers.splice(idx, 1);
    };
  }

  /** Number of traces currently stored. */
  size(): number {
    return this.traces.length;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * Shared event tracer instance used by all BoltSocket packages.
 */
export const tracer = new BoltSocketTracer();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enable event tracing. Records all inbound and outbound events with metadata.
 * Tracing is automatically enabled when `enableDebugLogs()` is called.
 *
 * @param options - Optional tracer configuration
 *
 * @example
 * ```ts
 * enableEventTracing();
 *
 * // Later inspect
 * console.table(getEventTraces());
 * ```
 */
export function enableEventTracing(options?: EventTracerOptions): void {
  tracer.configure({ enabled: true, ...options });
}

/**
 * Disable event tracing. Existing traces are preserved in history.
 */
export function disableEventTracing(): void {
  tracer.disable();
}

/**
 * Get all recorded event traces.
 *
 * @example
 * ```ts
 * const traces = getEventTraces();
 * const failed = traces.filter(t => !t.validated);
 * ```
 */
export function getEventTraces(): EventTrace[] {
  return tracer.getTraces();
}

/**
 * Get traces for a specific event name.
 *
 * @example
 * ```ts
 * const orderTraces = getEventTracesByName('order.updated');
 * ```
 */
export function getEventTracesByName(eventName: string): EventTrace[] {
  return tracer.getTracesByEvent(eventName);
}

/**
 * Get all traces that failed validation.
 * These represent potential data contract violations between server and client.
 */
export function getFailedEventTraces(): EventTrace[] {
  return tracer.getFailedTraces();
}

/**
 * Subscribe to event traces as they are recorded in real time.
 * Useful for custom monitoring dashboards or test assertions.
 *
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const off = onEventTraced((trace) => {
 *   myDashboard.record(trace);
 * });
 *
 * // Stop listening
 * off();
 * ```
 */
export function onEventTraced(callback: (trace: EventTrace) => void): () => void {
  return tracer.onTrace(callback);
}

/**
 * Clear all stored event traces.
 */
export function clearEventTraces(): void {
  tracer.clearTraces();
}
