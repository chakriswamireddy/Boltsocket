# @bolt-socket/react

React hooks and components for type-safe WebSocket events with bolt-socket.

## Installation

```bash
npm install @bolt-socket/react @bolt-socket/core socket.io-client
```

## Quick Start

### 1. Wrap your app with SocketProvider

```tsx
import { SocketProvider } from '@bolt-socket/react';
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed', 'cancelled'])
  })
});

function App() {
  return (
    <SocketProvider 
      url="http://localhost:3000"
      events={events}
    >
      <YourApp />
    </SocketProvider>
  );
}
```

### 2. Listen to events in any component

```tsx
import { useSocketEvent } from '@bolt-socket/react';

function OrderStatus({ orderId }) {
  useSocketEvent('order.updated', (data) => {
    // Fully typed data with autocomplete
    console.log('Order', data.orderId, 'is now', data.status);
  });

  return <div>Listening for updates...</div>;
}
```

## Features

- ✅ **Automatic cleanup** - Listeners removed on unmount
- ✅ **Reconnection handling** - Listeners reattached automatically
- ✅ **Type-safe** - Full TypeScript inference from event registry
- ✅ **No duplicate listeners** - Multiple components can use same event safely
- ✅ **Fresh closures** - Handler functions always have latest values
- ✅ **Auth support** - Pass auth tokens to socket connection

## API

### `<SocketProvider>`

Context provider that manages socket connection.

**Props:**
- `url: string` - Socket.IO server URL
- `events: EventRegistry` - Event registry from @bolt-socket/core
- `auth?: object | (() => object)` - Optional auth data or function
- `options?: SocketIOClientOptions` - Additional socket.io-client options
- `children: ReactNode`

### `useSocketEvent(eventName, handler, deps?)`

Subscribe to a socket event with automatic cleanup.

**Parameters:**
- `eventName` - Type-safe event name from registry
- `handler` - Callback function with typed payload
- `deps?` - Optional dependency array (like useEffect)

**Returns:** void

### `useSocket()`

Access the raw socket instance.

**Returns:** `Socket | null`

## Examples

### With Authentication

```tsx
<SocketProvider
  url="http://localhost:3000"
  events={events}
  auth={() => ({
    token: localStorage.getItem('token')
  })}
>
  <App />
</SocketProvider>
```

### Multiple Listeners

```tsx
function Dashboard() {
  useSocketEvent('order.updated', (data) => {
    console.log('Order updated:', data.orderId);
  });

  useSocketEvent('user.connected', (data) => {
    console.log('User joined:', data.username);
  });

  return <div>Dashboard</div>;
}
```

### With Dependencies

```tsx
function OrderTracker({ orderId }) {
  useSocketEvent('order.updated', (data) => {
    if (data.orderId === orderId) {
      console.log('My order updated!');
    }
  }, [orderId]); // Resubscribe when orderId changes

  return <div>Tracking order {orderId}</div>;
}
```

## License

MIT
