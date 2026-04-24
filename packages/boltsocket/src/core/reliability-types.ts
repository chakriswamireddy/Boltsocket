/**
 * Reconnection strategy configuration.
 * Controls how the client behaves when the network drops.
 * Maps directly to Socket.IO client reconnection options.
 */
export interface ReconnectOptions {
  /**
   * Maximum number of reconnection attempts before giving up.
   * Set to Infinity to retry forever.
   * @default Infinity
   */
  maxAttempts?: number;

  /**
   * Initial delay between reconnection attempts in milliseconds.
   * Subsequent attempts may have longer delays if backoff is applied.
   * @default 1000
   */
  delay?: number;

  /**
   * Maximum delay cap between reconnection attempts in milliseconds.
   * Prevents exponential backoff from growing without bound.
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Randomization factor (jitter) applied to reconnect delays.
   * Value between 0 and 1. Set to 0 to disable jitter.
   * Jitter prevents the "thundering herd" problem when many clients reconnect simultaneously.
   * @default 0.5
   */
  randomization?: number;
}

/**
 * A single buffered event stored for potential replay on client reconnection.
 */
export interface EventReplayEntry {
  /** Event name as defined in the registry */
  eventName: string;
  /** Validated event payload */
  payload: unknown;
  /** Unix timestamp (ms) when the event was emitted */
  timestamp: number;
  /** Room the event was emitted to, if any. Global broadcasts have no room. */
  room?: string;
}

/**
 * Event replay buffer configuration for the server.
 * When enabled, the server buffers recent events and can replay them
 * to clients that reconnect after a network interruption.
 */
export interface ReplayOptions {
  /**
   * Enable event buffering for replay.
   * @default false
   */
  enabled: boolean;

  /**
   * Maximum number of events to keep in the buffer.
   * When the buffer is full, the oldest events are dropped.
   * @default 200
   */
  bufferSize?: number;

  /**
   * Time-to-live for buffered events in milliseconds.
   * Events older than this duration are evicted from the buffer.
   * @default 300000 (5 minutes)
   */
  ttlMs?: number;
}

/**
 * Reliability configuration for the socket server.
 */
export interface ReliabilityOptions {
  /**
   * Event replay buffer configuration.
   * When enabled, the server buffers emitted events and can replay
   * them to clients that reconnect after a network interruption.
   *
   * @example
   * ```ts
   * const server = createSocketServer({
   *   events,
   *   io,
   *   reliability: {
   *     replay: {
   *       enabled: true,
   *       bufferSize: 500,
   *       ttlMs: 10 * 60 * 1000 // 10 minutes
   *     }
   *   }
   * });
   * ```
   */
  replay?: ReplayOptions;
}

/**
 * Internal protocol: sent by server to client immediately on connection.
 * Client stores this and sends it back on reconnect to enable event replay.
 *
 * @internal
 */
export interface BoltSessionPayload {
  /** Unique session identifier (socket.id of the original connection) */
  sessionId: string;
  /** Unix timestamp (ms) when this session was established */
  connectedAt: number;
}

/**
 * Internal protocol: sent by client to server after reconnecting.
 * Server uses this to replay events the client missed while disconnected.
 *
 * @internal
 */
export interface BoltSyncPayload {
  /** Unix timestamp (ms) of the last confirmed connection */
  since: number;
  /** Optional list of rooms client was subscribed to for filtered replay */
  rooms?: string[];
}

/**
 * Internal protocol event names used by BoltSocket's reliability layer.
 *
 * @internal
 */
export const BOLT_EVENTS = {
  /** Server → Client: Provides session info on connect */
  SESSION: 'bolt:session',
  /** Client → Server: Requests event replay after reconnect */
  SYNC: 'bolt:sync',
  /** Server → Client: Replays a single missed event */
  REPLAY: 'bolt:replay',
  /** Server → Client: Signals end of replay stream */
  REPLAY_DONE: 'bolt:replay:done',
} as const;
