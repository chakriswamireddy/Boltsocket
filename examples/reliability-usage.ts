/**
 * Phase 7: Reliability Layer — Complete Usage Examples
 *
 * Demonstrates:
 * 1. Configurable reconnection strategy (exponential backoff with jitter)
 * 2. Server-side event replay buffer
 * 3. bolt:session / bolt:sync protocol
 * 4. onClientReconnect server hook
 * 5. React hooks: useReconnect, useConnectionStatus, useEventReplay
 *
 * Run server:  bun run reliability-usage.ts
 * Open client: http://localhost:3001
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';
import { z } from 'zod';

// ─── 1. Event Registry (shared with client) ───────────────────────────────────

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    updatedAt: z.number(),
  }),
  'notification': z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'warning', 'error']),
  }),
  'price.changed': z.object({
    productId: z.string(),
    oldPrice: z.number(),
    newPrice: z.number(),
  }),
});

// ─── 2. Socket.IO + BoltSocket server with replay enabled ─────────────────────

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

const server = createSocketServer({
  events,
  io,

  // ✅ Phase 7: Enable event replay buffer
  // Server will buffer the last 500 events for up to 10 minutes
  reliability: {
    replay: {
      enabled: true,
      bufferSize: 500,
      ttlMs: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// ─── 3. onClientReconnect — React to client reconnections ────────────────────

const off = server.onClientReconnect((socket, missedEvents) => {
  console.log(`\n🔄 Client ${socket.id} reconnected`);
  console.log(`   Missed ${missedEvents.length} events while disconnected`);

  // Re-join user-specific rooms if using auth context
  // const userId = (socket as any).auth?.userId;
  // if (userId) server.joinRoom(socket.id, `user:${userId}`);

  // The missed events are already automatically replayed via bolt:sync protocol.
  // Use this hook for side effects: re-joining rooms, sending fresh state, etc.
  if (missedEvents.length > 0) {
    console.log('   Events replayed:');
    for (const e of missedEvents) {
      console.log(`     ← ${e.eventName} (at ${new Date(e.timestamp).toISOString()})`);
    }
  }
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  off();
  process.exit(0);
});

// ─── 4. Simulate real-time events ─────────────────────────────────────────────

let orderCounter = 1;

function simulateOrderUpdates() {
  setInterval(() => {
    const orderId = `order-${orderCounter++}`;

    // These events are automatically buffered in the replay buffer
    server.emit('order.updated', {
      orderId,
      status: 'processing',
      updatedAt: Date.now(),
    });

    console.log(`📦 Emitted order.updated for ${orderId}`);

    // Check buffer size
    const buffer = server.getReplayBuffer();
    if (buffer) {
      console.log(`   Buffer: ${buffer.size()} events stored`);
    }
  }, 3000); // Every 3 seconds
}

// ─── 5. Manual replay — server-side control ───────────────────────────────────

io.on('connection', (socket) => {
  console.log(`\n✅ Client connected: ${socket.id}`);

  // Manual replay endpoint: client can request specific replay
  socket.on('request:replay', ({ since }: { since: number }) => {
    console.log(`📼 Manual replay requested by ${socket.id} since ${new Date(since).toISOString()}`);
    server.replayEventsTo(socket.id, since);
  });
});

// ─── 6. Start server ──────────────────────────────────────────────────────────

httpServer.listen(3001, () => {
  console.log('🚀 Reliability server running on port 3001');
  console.log('   Event replay: ENABLED (500 events, 10 min TTL)');
  simulateOrderUpdates();
});

// ─── 7. React client example (illustrative) ───────────────────────────────────

/*
 * In your React app:
 *
 * import {
 *   SocketProvider,
 *   useReconnect,
 *   useConnectionStatus,
 *   useEventReplay,
 *   useSocketEvent,
 * } from '@bolt-socket/react';
 *
 * // ── Root: configure provider with reliability options ──────────────────────
 * function App() {
 *   return (
 *     <SocketProvider
 *       url="http://localhost:3001"
 *       events={events}
 *
 *       // ✅ Phase 7: Custom reconnect strategy
 *       reconnect={{
 *         maxAttempts: 20,           // Give up after 20 attempts
 *         delay: 500,                // Start with 500ms delay
 *         maxDelay: 30_000,          // Cap at 30 seconds
 *         randomization: 0.4,        // Add jitter to spread reconnect storms
 *       }}
 *
 *       // ✅ Phase 7: Request missed events on reconnect
 *       syncOnReconnect={true}
 *
 *       // ✅ Phase 7: Reconnect callbacks
 *       onReconnect={(attempt) => {
 *         console.log(`Reconnected after attempt ${attempt}`);
 *         toast.success('Connection restored!');
 *       }}
 *       onReconnectAttempt={(n) => setRetryCount(n)}
 *       onDisconnect={(reason) => {
 *         if (reason !== 'io client disconnect') {
 *           toast.warning('Connection lost, retrying...');
 *         }
 *       }}
 *     >
 *       <Dashboard />
 *     </SocketProvider>
 *   );
 * }
 *
 * // ── Component: react to reconnect ─────────────────────────────────────────
 * function Dashboard() {
 *   const [orders, setOrders] = useState([]);
 *
 *   // ✅ Phase 7: Fire callback on every successful reconnect
 *   useReconnect((attempt) => {
 *     console.log(`Reconnected after ${attempt} tries — refreshing data`);
 *     refetchCriticalData();
 *   });
 *
 *   // ✅ Phase 7: Connection status indicator
 *   const { isConnected, reconnectCount, lastConnectedAt } = useConnectionStatus();
 *
 *   // ✅ Phase 7: Consume events replayed from server buffer
 *   useEventReplay({
 *     onReplayEvent: (entry) => {
 *       if (entry.eventName === 'order.updated') {
 *         const order = entry.payload as OrderPayload;
 *         setOrders(prev => {
 *           const updated = prev.filter(o => o.orderId !== order.orderId);
 *           return [order, ...updated];
 *         });
 *       }
 *     },
 *     onReplayDone: (count, since) => {
 *       console.log(`Caught up: ${count} events since ${new Date(since).toISOString()}`);
 *       toast.info(`Synced ${count} missed updates`);
 *     },
 *   });
 *
 *   // ✅ Live events (these arrive in real time after replay completes)
 *   useSocketEvent('order.updated', (data) => {
 *     setOrders(prev => [data, ...prev.filter(o => o.orderId !== data.orderId)]);
 *   });
 *
 *   return (
 *     <div>
 *       <ConnectionBadge isConnected={isConnected} reconnectCount={reconnectCount} />
 *       <OrderList orders={orders} />
 *     </div>
 *   );
 * }
 *
 * // ── Component: connection indicator ───────────────────────────────────────
 * function ConnectionBadge({ isConnected, reconnectCount }) {
 *   const { lastConnectedAt, lastDisconnectedAt } = useConnectionStatus();
 *
 *   return (
 *     <div className={`badge ${isConnected ? 'online' : 'offline'}`}>
 *       {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
 *       {reconnectCount > 0 && (
 *         <small> (reconnected {reconnectCount}×)</small>
 *       )}
 *     </div>
 *   );
 * }
 */

// ─── 8. Reconnect strategy explained ─────────────────────────────────────────

/**
 * BoltSocket Reconnect Strategy
 * ──────────────────────────────────────────────────────────────────────────
 *
 * The reconnect options map to Socket.IO client configuration:
 *
 * | BoltSocket option | Socket.IO option           | Default  |
 * |-------------------|----------------------------|----------|
 * | delay             | reconnectionDelay          | 1000 ms  |
 * | maxDelay          | reconnectionDelayMax       | 30000 ms |
 * | maxAttempts       | reconnectionAttempts       | Infinity |
 * | randomization     | randomizationFactor        | 0.5      |
 *
 * Actual delay formula (Socket.IO internal):
 *   attempt_delay = min(delay * multiplier^attempt, maxDelay)
 *   jitter        = attempt_delay * randomization * random()
 *   final_delay   = attempt_delay + jitter
 *
 * With defaults (delay=1000, maxDelay=5000, randomization=0.5):
 *   Attempt 1: ~1000–1500ms
 *   Attempt 2: ~2000–3000ms
 *   Attempt 3: ~5000ms (capped)
 *
 * With custom (delay=500, maxDelay=30000, randomization=0.4):
 *   Attempt 1:  ~500–700ms
 *   Attempt 2:  ~1000–1400ms
 *   ...
 *   Attempt 10: ~30000ms (capped)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Event Replay Protocol (bolt:session / bolt:sync)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * 1. CLIENT connects
 *    SERVER → bolt:session { sessionId, connectedAt }
 *    CLIENT stores connectedAt in ref
 *
 * 2. CLIENT disconnects (network drop, tab sleep, etc.)
 *
 * 3. CLIENT reconnects (Socket.IO auto-reconnect)
 *    Provider sends: CLIENT → bolt:sync { since: lastConnectedAt, rooms: [...] }
 *
 * 4. SERVER finds all events since `since` in replay buffer
 *    SERVER → bolt:replay { eventName, payload, timestamp, room? }  (×N)
 *    SERVER → bolt:replay:done { count, since }
 *
 * 5. useEventReplay() hook receives replayed events and fires onReplayEvent
 *    useEventReplay() fires onReplayDone when bolt:replay:done arrives
 *
 * 6. Regular events continue arriving via useSocketEvent as usual
 */
