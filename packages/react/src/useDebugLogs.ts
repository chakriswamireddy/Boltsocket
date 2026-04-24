import { useState, useEffect, useCallback, useRef } from 'react';
import {
  logger,
  tracer,
  enableDebugLogs,
  disableDebugLogs,
  enableEventTracing,
  disableEventTracing,
  onEventTraced,
} from '@bolt-socket/core';
import type {
  LogEntry,
  BoltLoggerOptions,
  LogCategory,
  LogLevel,
} from '@bolt-socket/core';
import type { EventTrace } from '@bolt-socket/core';

// ─── useDebugLogs ─────────────────────────────────────────────────────────────

/** Options for {@link useDebugLogs}. */
export interface UseDebugLogsOptions {
  /**
   * Minimum log level to collect.
   * @default 'debug'
   */
  level?: LogLevel;
  /**
   * Filter to specific log categories. Omit to collect all.
   */
  categories?: LogCategory[];
  /**
   * Maximum entries kept in the hook's local list.
   * @default 200
   */
  maxEntries?: number;
  /**
   * Enable logging immediately on mount.
   * @default true
   */
  autoEnable?: boolean;
}

/** Return value of {@link useDebugLogs}. */
export interface UseDebugLogsResult {
  /** All log entries collected while the hook is active. */
  logs: LogEntry[];
  /** Whether the logger is currently active. */
  isEnabled: boolean;
  /** Enable logging. */
  enable: (options?: BoltLoggerOptions) => void;
  /** Disable logging. */
  disable: () => void;
  /** Clear the local log list. */
  clear: () => void;
  /** Filter current logs by category. */
  filterByCategory: (category: LogCategory) => LogEntry[];
  /** Filter current logs by level. */
  filterByLevel: (level: Exclude<LogLevel, 'silent'>) => LogEntry[];
}

/**
 * useDebugLogs — React hook for live BoltSocket log inspection.
 *
 * Activates structured logging and pushes new entries into React state so
 * you can display them in a debug overlay, test against them, or forward
 * them to monitoring services.
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const { logs, clear, filterByCategory } = useDebugLogs({
 *     level: 'debug',
 *     categories: ['connection', 'event'],
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={clear}>Clear</button>
 *       {logs.map((l, i) => (
 *         <div key={i} className={`log-${l.level}`}>
 *           [{l.category}] {l.message}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDebugLogs(options: UseDebugLogsOptions = {}): UseDebugLogsResult {
  const {
    level = 'debug',
    categories,
    maxEntries = 200,
    autoEnable = true,
  } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isEnabled, setIsEnabled] = useState(logger.isEnabled());
  const maxRef = useRef(maxEntries);

  useEffect(() => {
    maxRef.current = maxEntries;
  }, [maxEntries]);

  useEffect(() => {
    const handleLog = (entry: LogEntry) => {
      if (categories && categories.length > 0 && !categories.includes(entry.category)) {
        return;
      }
      setLogs(prev => {
        const next = [...prev, entry];
        return next.length > maxRef.current
          ? next.slice(next.length - maxRef.current)
          : next;
      });
    };

    if (autoEnable) {
      enableDebugLogs({ level, categories, onLog: handleLog });
      setIsEnabled(true);
    } else {
      // Still capture logs if already enabled, via onLog hook
      enableDebugLogs({ onLog: handleLog });
    }

    return () => {
      // Re-configure without onLog to stop this hook's listener
      enableDebugLogs({ level, categories });
    };
  }, [autoEnable, level, categories?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const enable = useCallback(
    (opts?: BoltLoggerOptions) => {
      enableDebugLogs({ level, categories, ...opts });
      setIsEnabled(true);
    },
    [level, categories]
  );

  const disable = useCallback(() => {
    disableDebugLogs();
    setIsEnabled(false);
  }, []);

  const clear = useCallback(() => {
    setLogs([]);
  }, []);

  const filterByCategory = useCallback(
    (category: LogCategory): LogEntry[] => logs.filter(l => l.category === category),
    [logs]
  );

  const filterByLevel = useCallback(
    (lvl: Exclude<LogLevel, 'silent'>): LogEntry[] => logs.filter(l => l.level === lvl),
    [logs]
  );

  return { logs, isEnabled, enable, disable, clear, filterByCategory, filterByLevel };
}

// ─── useEventTraces ───────────────────────────────────────────────────────────

/** Options for {@link useEventTraces}. */
export interface UseEventTracesOptions {
  /**
   * Maximum traces kept in the hook's local list.
   * @default 200
   */
  maxTraces?: number;
  /**
   * Enable event tracing immediately on mount.
   * @default true
   */
  autoEnable?: boolean;
  /**
   * Only collect traces for these event names.
   * Omit to collect traces for all events.
   */
  events?: string[];
}

/** Return value of {@link useEventTraces}. */
export interface UseEventTracesResult {
  /** All recorded event traces. */
  traces: EventTrace[];
  /** Whether tracing is currently active. */
  isEnabled: boolean;
  /** Enable tracing. */
  enable: () => void;
  /** Disable tracing. */
  disable: () => void;
  /** Clear the local trace list. */
  clear: () => void;
  /** Get traces for a specific event name. */
  forEvent: (eventName: string) => EventTrace[];
  /** All traces that failed validation. */
  failedTraces: EventTrace[];
}

/**
 * useEventTraces — React hook for live BoltSocket event trace inspection.
 *
 * Renders inbound and outbound event traces into React state so you can
 * build a debug overlay, event log, or test assertions.
 *
 * @example
 * ```tsx
 * function EventLog() {
 *   const { traces, failedTraces } = useEventTraces();
 *
 *   return (
 *     <div>
 *       {failedTraces.length > 0 && (
 *         <p className="error">⚠️ {failedTraces.length} validation failure(s)</p>
 *       )}
 *       {traces.map(t => (
 *         <div key={t.id}>
 *           {t.direction === 'inbound' ? '← ' : '→ '}
 *           <strong>{t.eventName}</strong>
 *           {!t.validated && <span> ❌ {t.validationError}</span>}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventTraces(options: UseEventTracesOptions = {}): UseEventTracesResult {
  const { maxTraces = 200, autoEnable = true, events: eventFilter } = options;

  const [traces, setTraces] = useState<EventTrace[]>([]);
  const [isEnabled, setIsEnabled] = useState(tracer.isEnabled());
  const maxRef = useRef(maxTraces);

  useEffect(() => {
    maxRef.current = maxTraces;
  }, [maxTraces]);

  useEffect(() => {
    if (autoEnable) {
      enableEventTracing();
      setIsEnabled(true);
    }

    const off = onEventTraced((trace) => {
      if (eventFilter && !eventFilter.includes(trace.eventName)) return;
      setTraces(prev => {
        const next = [...prev, trace];
        return next.length > maxRef.current
          ? next.slice(next.length - maxRef.current)
          : next;
      });
    });

    return () => {
      off();
    };
  }, [autoEnable, eventFilter?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const enable = useCallback(() => {
    enableEventTracing();
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    disableEventTracing();
    setIsEnabled(false);
  }, []);

  const clear = useCallback(() => {
    setTraces([]);
  }, []);

  const forEvent = useCallback(
    (eventName: string): EventTrace[] => traces.filter(t => t.eventName === eventName),
    [traces]
  );

  const failedTraces = traces.filter(t => !t.validated);

  return { traces, isEnabled, enable, disable, clear, forEvent, failedTraces };
}

// ─── useDevMode ───────────────────────────────────────────────────────────────

/**
 * useDevMode — One-call hook enabling both logging and event tracing.
 *
 * Intended for debug panels and development-only components.
 *
 * @example
 * ```tsx
 * function DevToolsPanel() {
 *   const { logs, traces, failedTraces } = useDevMode();
 *   return (
 *     <details>
 *       <summary>🔧 DevTools ({traces.length} events)</summary>
 *       {failedTraces.length > 0 && <p>⚠️ {failedTraces.length} validation failures</p>}
 *     </details>
 *   );
 * }
 * ```
 */
export function useDevMode(): UseDebugLogsResult & {
  traces: EventTrace[];
  failedTraces: EventTrace[];
} {
  const logsResult = useDebugLogs({ level: 'debug' });
  const tracesResult = useEventTraces({ autoEnable: true });

  return {
    ...logsResult,
    traces: tracesResult.traces,
    failedTraces: tracesResult.failedTraces,
  };
}
