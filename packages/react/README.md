# @bolt-socket/react

React hooks and provider for type-safe real-time WebSocket events with auto-reconnect and observability.

## Installation

```bash
pnpm add @bolt-socket/react @bolt-socket/core socket.io-client react
```

## Usage

```tsx
import { SocketProvider, useSocketEvent, useSocket } from '@bolt-socket/react';
import { events } from './events'; // createEventRegistry(...)

function App() {
  return (
    <SocketProvider
      url="http://localhost:3001"
      events={events}
      auth={async () => ({ token: await getAuthToken() })}
      reconnect={{ maxAttempts: 10, delay: 1000, maxDelay: 30_000 }}
      syncOnReconnect
      onReconnect={(attempt) => console.log('reconnected after attempt', attempt)}
      onAuthError={() => navigate('/login')}
    >
      <Dashboard />
    </SocketProvider>
  );
}

function Dashboard() {
  const { isConnected } = useSocket();

  useSocketEvent('order.updated', (data) => {
    // data: { orderId: string; status: 'pending' | 'shipped' | ... }
    setOrder(data);
  });

  return <span>{isConnected ? 'Online' : 'Offline'}</span>;
}
```

## Reliability hooks

```ts
import { useReconnect, useConnectionStatus, useEventReplay } from '@bolt-socket/react';

// Fire callback after every reconnect
useReconnect(() => refetchCriticalData());

// Track connection state
const { reconnectCount, lastConnectedAt } = useConnectionStatus();

// Receive replayed events from server
useEventReplay({
  onReplay: (entries) => entries.forEach(applyEntry),
  onReplayDone: () => setReady(true),
});
```

## Observability hooks

```tsx
import { useDebugLogs, useEventTraces } from '@bolt-socket/react';

function DevPanel() {
  const { logs, filterByCategory } = useDebugLogs();
  const { failedTraces } = useEventTraces();
  // render live diagnostic UI
}
```

## License

MIT
