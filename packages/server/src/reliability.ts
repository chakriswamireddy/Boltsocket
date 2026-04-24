import type { EventReplayEntry, ReplayOptions } from '@bolt-socket/core';

/**
 * Circular event buffer for storing recent events for replay on client reconnection.
 *
 * Events are stored in chronological order. Eviction happens when:
 * 1. Buffer exceeds its size limit  (oldest events dropped first)
 * 2. Events exceed their TTL        (expired events swept out)
 *
 * @example
 * ```ts
 * const buffer = new EventReplayBuffer({ enabled: true, bufferSize: 200, ttlMs: 300_000 });
 *
 * buffer.add({ eventName: 'order.updated', payload: { orderId: '1' }, timestamp: Date.now() });
 *
 * const missed = buffer.getEventsSince(lastSeenTimestamp);
 * ```
 */
export class EventReplayBuffer {
  private readonly buffer: EventReplayEntry[] = [];
  private readonly bufferSize: number;
  private readonly ttlMs: number;

  constructor(options: ReplayOptions) {
    this.bufferSize = options.bufferSize ?? 200;
    this.ttlMs = options.ttlMs ?? 300_000; // 5 minutes
  }

  /**
   * Add an event to the buffer.
   * If the buffer is full, the oldest event is dropped first.
   */
  add(entry: EventReplayEntry): void {
    this.evictExpired();
    this.buffer.push(entry);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get all events that occurred strictly after the given timestamp.
   *
   * @param timestamp - Unix timestamp (ms) of the last known event
   * @param rooms     - Optional room filter; only returns events for these rooms
   *                    plus all global (room-less) events
   */
  getEventsSince(timestamp: number, rooms?: string[]): EventReplayEntry[] {
    this.evictExpired();
    return this.buffer.filter(entry => {
      if (entry.timestamp <= timestamp) return false;
      if (rooms && rooms.length > 0) {
        // Include global events + events for rooms the client was in
        return !entry.room || rooms.includes(entry.room);
      }
      return true;
    });
  }

  /** Get all buffered events (newest last). */
  getAll(): EventReplayEntry[] {
    this.evictExpired();
    return [...this.buffer];
  }

  /** Number of events currently in the buffer. */
  size(): number {
    return this.buffer.length;
  }

  /** Remove all events from the buffer. */
  clear(): void {
    this.buffer.length = 0;
  }

  private evictExpired(): void {
    const cutoff = Date.now() - this.ttlMs;
    while (this.buffer.length > 0 && this.buffer[0].timestamp < cutoff) {
      this.buffer.shift();
    }
  }
}
