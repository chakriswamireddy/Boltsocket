/**
 * Phase 8: Observability & Debugging — Complete Usage Examples
 *
 * Demonstrates:
 * 1. enableDebugLogs() — structured logging with levels and categories
 * 2. EventTracer — inbound/outbound event tracing with metadata
 * 3. Dev mode warnings — invalid payloads, unknown events
 * 4. React hooks — useDebugLogs, useEventTraces, useDevMode
 * 5. Custom log sinks — Sentry, Datadog, custom monitoring
 * 6. getLogHistory() / getEventTraces() — programmatic inspection
 */

import {
  enableDebugLogs,
  disableDebugLogs,
  getLogHistory,
  clearLogHistory,
  enableEventTracing,
  disableEventTracing,
  getEventTraces,
  getEventTracesByName,
  getFailedEventTraces,
  onEventTraced,
  clearEventTraces,
  logger,
  tracer,
  createEventRegistry,
} from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';

// ─── 1. enableDebugLogs() — the main entry point ──────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 1: enableDebugLogs()');
console.log('═══════════════════════════════════════\n');

// Basic: enable all logs at debug level
enableDebugLogs();
logger.debug('event', 'Debug logging is now active');
logger.info('connection', 'Server starting…');
logger.warn('auth', 'No auth middleware configured');
logger.error('validation', 'Payload mismatch detected', { field: 'status' });

disableDebugLogs();
logger.debug('event', 'This will NOT appear — logging is disabled');

// ─── 2. Level filtering ───────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 2: Level filtering');
console.log('═══════════════════════════════════════\n');

enableDebugLogs({ level: 'warn' }); // only warn and error

logger.debug('event', 'This is filtered out (debug < warn)');  // hidden
logger.info('connection', 'This is filtered out (info < warn)'); // hidden
logger.warn('reliability', 'Reconnect attempt 3 of 10');         // shown
logger.error('auth', 'Token expired — rejecting connection');    // shown

disableDebugLogs();

// ─── 3. Category filtering ────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 3: Category filtering');
console.log('═══════════════════════════════════════\n');

enableDebugLogs({
  level: 'debug',
  categories: ['connection', 'auth'], // only these two categories
});

logger.debug('event', 'Filtered out — not in categories');       // hidden
logger.info('room', 'Filtered out — room not in categories');    // hidden
logger.info('connection', 'Client connected: socket-abc-123');   // shown
logger.warn('auth', 'Token expiring in 2 minutes');              // shown

disableDebugLogs();

// ─── 4. Custom log sink ───────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 4: Custom log sink');
console.log('═══════════════════════════════════════\n');

const collectedErrors: any[] = [];

enableDebugLogs({
  level: 'debug',
  onLog: (entry) => {
    // Forward errors to an external service
    if (entry.level === 'error') {
      collectedErrors.push({
        message: entry.message,
        category: entry.category,
        data: entry.data,
        time: new Date(entry.timestamp).toISOString(),
      });
      // In real code: Sentry.captureMessage(entry.message, { extra: entry.data });
    }

    // Forward all entries to a custom monitoring dashboard
    // myDashboard.recordLog(entry);
  },
});

logger.error('validation', 'Schema validation failed', { eventName: 'order.updated', field: 'status' });
logger.error('auth', 'Invalid JWT signature');

console.log('Errors forwarded to sink:', collectedErrors.length);
disableDebugLogs();

// ─── 5. getLogHistory() — programmatic inspection ─────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 5: getLogHistory()');
console.log('═══════════════════════════════════════\n');

clearLogHistory();
enableDebugLogs({ level: 'debug' });

logger.info('connection', 'Client A connected');
logger.info('connection', 'Client B connected');
logger.warn('auth', 'Client A token expires soon');
logger.error('auth', 'Client B token invalid — rejecting');
logger.debug('event', 'order.updated emitted');
logger.debug('event', 'notification emitted');

const history = getLogHistory();
console.log(`Total log entries: ${history.length}`);

const errors = logger.getHistoryByLevel('error');
console.log(`Error entries: ${errors.length}`);
errors.forEach(e => console.log(`  [${e.category}] ${e.message}`));

const authLogs = logger.getHistoryByCategory('auth');
console.log(`Auth log entries: ${authLogs.length}`);

disableDebugLogs();
clearLogHistory();

// ─── 6. Event Tracer ─────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 6: Event Tracer');
console.log('═══════════════════════════════════════\n');

enableEventTracing();

// Manually trace some events (packages do this automatically)
tracer.trace({
  eventName: 'order.updated',
  direction: 'outbound',
  payload: { orderId: '123', status: 'completed' },
  validated: true,
});

tracer.trace({
  eventName: 'notification',
  direction: 'inbound',
  payload: { message: 'Hello', type: 'info' },
  validated: true,
  durationMs: 2,
});

tracer.trace({
  eventName: 'order.updated',
  direction: 'inbound',
  payload: { orderId: null }, // invalid
  validated: false,
  validationError: 'orderId: Expected string, received null',
});

const traces = getEventTraces();
console.log(`Total traces: ${traces.length}`);

const orderTraces = getEventTracesByName('order.updated');
console.log(`Traces for order.updated: ${orderTraces.length}`);

const failedTraces = getFailedEventTraces();
console.log(`Failed validation traces: ${failedTraces.length}`);
failedTraces.forEach(t => {
  console.log(`  ❌ ${t.eventName}: ${t.validationError}`);
});

// ─── 7. onEventTraced — real-time subscription ────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 7: onEventTraced()');
console.log('═══════════════════════════════════════\n');

clearEventTraces();

const unsubscribe = onEventTraced((trace) => {
  const arrow = trace.direction === 'inbound' ? '←' : '→';
  const status = trace.validated ? '✅' : '❌';
  console.log(
    `  ${arrow} [${status}] ${trace.eventName}` +
    (trace.validationError ? ` — ${trace.validationError}` : '')
  );
});

tracer.trace({ eventName: 'price.changed', direction: 'outbound', payload: { productId: 'p1' }, validated: true });
tracer.trace({ eventName: 'order.updated', direction: 'inbound', payload: {}, validated: false, validationError: 'orderId: Required' });

unsubscribe(); // Stop listening

tracer.trace({ eventName: 'notification', direction: 'outbound', payload: {}, validated: true });
// Above trace is NOT printed — subscriber was removed

disableEventTracing();

// ─── 8. Server integration — end-to-end example ──────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(' Example 8: Full server with observability');
console.log('═══════════════════════════════════════\n');

// Enable before creating the server so all events are captured from the start
enableDebugLogs({ level: 'debug' });
enableEventTracing({ maxTraces: 1000 });

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed']),
  }),
});

const httpServer = createServer();
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

const server = createSocketServer({ events, io });

// Server now logs all:
// - connection / disconnection events
// - auth success / failure
// - event emissions (outbound traces)
// - validation failures
// - room joins / leaves
// - replay operations

// ─── 9. Health check — inspect logs and traces ────────────────────────────────

function runHealthCheck() {
  const logs = getLogHistory();
  const traces = getEventTraces();
  const failed = getFailedEventTraces();

  console.log('\n📊 BoltSocket Health Check');
  console.log(`  Total logs:          ${logs.length}`);
  console.log(`  Total traces:        ${traces.length}`);
  console.log(`  Failed validations:  ${failed.length}`);

  if (failed.length > 0) {
    console.warn('\n⚠️  Validation failures detected:');
    failed.forEach(t => {
      console.warn(`   [${t.direction}] ${t.eventName}: ${t.validationError}`);
    });
  }

  const recentErrors = logger.getHistoryByLevel('error');
  if (recentErrors.length > 0) {
    console.error('\n❌ Recent errors:');
    recentErrors.forEach(e => console.error(`   [${e.category}] ${e.message}`));
  }

  console.log('\n✅ Health check complete');
}

// Run the health check after a short delay
setTimeout(runHealthCheck, 100);

// ─── 10. React hooks reference (illustrative) ─────────────────────────────────

/*
 * useDebugLogs — Render live logs in a React component
 * ──────────────────────────────────────────────────────────────────────────
 * import { useDebugLogs } from '@bolt-socket/react';
 *
 * function LogViewer() {
 *   const { logs, isEnabled, enable, disable, clear, filterByCategory } = useDebugLogs({
 *     level: 'debug',
 *     categories: ['connection', 'event', 'auth'],
 *     maxEntries: 100,
 *   });
 *
 *   const connectionLogs = filterByCategory('connection');
 *
 *   return (
 *     <div className="log-viewer">
 *       <div className="toolbar">
 *         <button onClick={() => isEnabled ? disable() : enable()}>
 *           {isEnabled ? 'Pause Logs' : 'Resume Logs'}
 *         </button>
 *         <button onClick={clear}>Clear</button>
 *         <span>{logs.length} entries</span>
 *       </div>
 *
 *       <div className="log-list">
 *         {logs.map((entry, i) => (
 *           <div key={i} className={`log log-${entry.level}`}>
 *             <span className="level">{entry.level}</span>
 *             <span className="category">{entry.category}</span>
 *             <span className="message">{entry.message}</span>
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 *
 * ──────────────────────────────────────────────────────────────────────────
 * useEventTraces — Render live event traces in a React component
 * ──────────────────────────────────────────────────────────────────────────
 * import { useEventTraces } from '@bolt-socket/react';
 *
 * function EventLog() {
 *   const { traces, failedTraces, forEvent, clear } = useEventTraces({
 *     maxTraces: 200,
 *   });
 *
 *   const orderTraces = forEvent('order.updated');
 *
 *   return (
 *     <div>
 *       {failedTraces.length > 0 && (
 *         <div className="alert error">
 *           ⚠️ {failedTraces.length} events failed schema validation!
 *         </div>
 *       )}
 *
 *       <h3>order.updated ({orderTraces.length} traces)</h3>
 *
 *       {traces.map(t => (
 *         <div key={t.id} className={`trace ${t.validated ? 'ok' : 'error'}`}>
 *           <span>{t.direction === 'inbound' ? '← ' : '→ '}</span>
 *           <strong>{t.eventName}</strong>
 *           {t.room && <small> → {t.room}</small>}
 *           {!t.validated && <span className="error"> ❌ {t.validationError}</span>}
 *           {t.durationMs !== undefined && <small> {t.durationMs}ms</small>}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 *
 * ──────────────────────────────────────────────────────────────────────────
 * useDevMode — Enable both logs AND traces in one hook
 * ──────────────────────────────────────────────────────────────────────────
 * import { useDevMode } from '@bolt-socket/react';
 *
 * function DevToolsPanel() {
 *   const { logs, traces, failedTraces, clear } = useDevMode();
 *
 *   return (
 *     <details>
 *       <summary>🔧 BoltSocket DevTools ({traces.length} traces, {logs.length} logs)</summary>
 *       {failedTraces.length > 0 && (
 *         <p style={{ color: 'red' }}>⚠️ {failedTraces.length} validation failures!</p>
 *       )}
 *       <button onClick={clear}>Clear all</button>
 *       <pre>{JSON.stringify({ traces: traces.slice(-10) }, null, 2)}</pre>
 *     </details>
 *   );
 * }
 */

// ─── Available log categories ─────────────────────────────────────────────────

/**
 * LogCategory reference:
 *
 * 'connection'   — connect, disconnect, reconnect events
 * 'auth'         — authentication success / failure / token refresh
 * 'event'        — emit and subscription lifecycle
 * 'validation'   — payload validation results (both success and failure)
 * 'room'         — join and leave operations
 * 'replay'       — event replay / bolt:sync protocol
 * 'reliability'  — reconnection strategy and onClientReconnect handlers
 *
 * LogLevel reference (lowest → highest):
 *
 * 'debug'  — verbose internal operations
 * 'info'   — important lifecycle events (connect, auth, rooms)
 * 'warn'   — non-fatal issues (validation failure, token expiry)
 * 'error'  — failures (auth rejected, unknown event, handler threw)
 * 'silent' — no output (default in production)
 */

console.log('\n✅ Observability examples complete\n');
