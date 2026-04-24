/**
 * @bolt-socket/core — Logger
 *
 * A zero-dependency structured logger used internally by all BoltSocket packages.
 * Silent by default in production; activated via `enableDebugLogs()`.
 *
 * @example
 * ```ts
 * import { enableDebugLogs, disableDebugLogs } from '@bolt-socket/core';
 *
 * // Enable full debug output to the console
 * enableDebugLogs();
 *
 * // Enable with custom options
 * enableDebugLogs({
 *   level: 'info',
 *   categories: ['connection', 'auth'],
 *   onLog: (entry) => sendToDatadog(entry),
 * });
 *
 * // Disable later
 * disableDebugLogs();
 * ```
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Logging severity. 'silent' disables all output. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Functional category of a log entry.
 * Allows consumers to filter to only the areas they care about.
 */
export type LogCategory =
  | 'connection'   // connect / disconnect / reconnect events
  | 'auth'         // authentication successes and failures
  | 'event'        // event emission and subscription
  | 'validation'   // payload validation results
  | 'room'         // room join / leave operations
  | 'replay'       // event replay / sync protocol
  | 'reliability'; // reconnection attempts and strategy

/** A single structured log record. */
export interface LogEntry {
  /** Severity of the entry. */
  level: Exclude<LogLevel, 'silent'>;
  /** Functional area that produced this entry. */
  category: LogCategory;
  /** Human-readable message. */
  message: string;
  /** Additional context (event payloads, error objects, metadata). */
  data?: unknown;
  /** Unix timestamp (ms) when the entry was created. */
  timestamp: number;
}

/** Configuration options for the logger. */
export interface BoltLoggerOptions {
  /**
   * Minimum log level to output.
   * Entries below this level are silently dropped.
   * @default 'silent'
   */
  level?: LogLevel;

  /**
   * Restrict output to these categories only.
   * When omitted (or empty), all categories are logged.
   *
   * @example ['connection', 'auth']
   */
  categories?: LogCategory[];

  /**
   * Custom log handler. Called in addition to (not instead of) console output.
   * Use this to forward logs to Datadog, Sentry, a custom store, etc.
   */
  onLog?: (entry: LogEntry) => void;

  /**
   * Prefix prepended to every console message.
   * @default '[BoltSocket]'
   */
  prefix?: string;

  /**
   * Maximum number of log entries to keep in the in-memory history.
   * Oldest entries are dropped when the limit is reached.
   * @default 500
   */
  maxHistory?: number;
}

// ─── Level ordering ───────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// ─── Logger class ─────────────────────────────────────────────────────────────

/**
 * Internal structured logger. Used by all BoltSocket packages.
 * Shared singleton via the exported `logger` constant.
 */
class BoltSocketLogger {
  private level: LogLevel = 'silent';
  private categories: LogCategory[] | null = null;
  private onLog?: (entry: LogEntry) => void;
  private prefix: string = '[BoltSocket]';
  private history: LogEntry[] = [];
  private maxHistory: number = 500;

  /** Apply configuration. Can be called multiple times to reconfigure. */
  configure(options: BoltLoggerOptions): void {
    if (options.level !== undefined) this.level = options.level;
    if (options.categories !== undefined) {
      this.categories = options.categories.length > 0 ? options.categories : null;
    }
    if (options.onLog !== undefined) this.onLog = options.onLog;
    if (options.prefix !== undefined) this.prefix = options.prefix;
    if (options.maxHistory !== undefined) this.maxHistory = options.maxHistory;
  }

  /** Reset logger to its initial silent state. */
  reset(): void {
    this.level = 'silent';
    this.categories = null;
    this.onLog = undefined;
    this.prefix = '[BoltSocket]';
    this.history = [];
    this.maxHistory = 500;
  }

  // ── Logging methods ─────────────────────────────────────────────────────────

  debug(category: LogCategory, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: LogCategory, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: LogCategory, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  // ── History ─────────────────────────────────────────────────────────────────

  /** All log entries recorded since the logger was last reset. */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /** Filter history by category. */
  getHistoryByCategory(category: LogCategory): LogEntry[] {
    return this.history.filter(e => e.category === category);
  }

  /** Filter history by level. */
  getHistoryByLevel(level: Exclude<LogLevel, 'silent'>): LogEntry[] {
    return this.history.filter(e => e.level === level);
  }

  /** Remove all stored log entries. */
  clearHistory(): void {
    this.history = [];
  }

  /** Whether logging is currently active (level !== 'silent'). */
  isEnabled(): boolean {
    return this.level !== 'silent';
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private log(
    level: Exclude<LogLevel, 'silent'>,
    category: LogCategory,
    message: string,
    data?: unknown
  ): void {
    if (this.level === 'silent') return;
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    if (this.categories && !this.categories.includes(category)) return;

    const entry: LogEntry = {
      level,
      category,
      message,
      data,
      timestamp: Date.now(),
    };

    // Store in history (drop oldest if over limit)
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Console output
    const tag = `${this.prefix} [${category}]`;
    const consoleArgs = data !== undefined ? [tag, message, data] : [tag, message];
    switch (level) {
      case 'debug': console.debug(...consoleArgs); break;
      case 'info':  console.info(...consoleArgs);  break;
      case 'warn':  console.warn(...consoleArgs);  break;
      case 'error': console.error(...consoleArgs); break;
    }

    // Custom handler
    try {
      this.onLog?.(entry);
    } catch {
      // Custom handlers must not crash the logger
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * Shared logger instance used by all BoltSocket packages.
 * Import this in server or React code to emit structured log entries.
 *
 * @example
 * ```ts
 * import { logger } from '@bolt-socket/core';
 * logger.info('connection', 'Client connected', { socketId });
 * ```
 */
export const logger = new BoltSocketLogger();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enable debug logging for BoltSocket.
 *
 * Call this once during application startup (before sockets connect) to see
 * all internal events. In production, keep it disabled to avoid log noise.
 *
 * @param options - Optional configuration overrides
 *
 * @example Basic — logs everything at debug level
 * ```ts
 * enableDebugLogs();
 * ```
 *
 * @example Targeted — only connection and auth logs
 * ```ts
 * enableDebugLogs({ level: 'info', categories: ['connection', 'auth'] });
 * ```
 *
 * @example With custom sink
 * ```ts
 * enableDebugLogs({
 *   onLog: (entry) => {
 *     if (entry.level === 'error') {
 *       Sentry.captureMessage(entry.message, { extra: { data: entry.data } });
 *     }
 *   }
 * });
 * ```
 */
export function enableDebugLogs(options?: BoltLoggerOptions): void {
  logger.configure({
    level: 'debug',
    ...options,
  });
}

/**
 * Disable all BoltSocket logging. Logs already in history are preserved.
 */
export function disableDebugLogs(): void {
  logger.configure({ level: 'silent' });
}

/**
 * Get all log entries recorded since logging was enabled.
 *
 * @example
 * ```ts
 * enableDebugLogs();
 * // ... later
 * const logs = getLogHistory();
 * console.table(logs);
 * ```
 */
export function getLogHistory(): LogEntry[] {
  return logger.getHistory();
}

/**
 * Clear the in-memory log history.
 */
export function clearLogHistory(): void {
  logger.clearHistory();
}
