# @bolt-socket/server

Socket.IO server abstraction with type-safe event emission.

## Installation

```bash
npm install @bolt-socket/server @bolt-socket/core socket.io zod
```

## Quick Start

```typescript
import { Server } from 'socket.io';
import { createSocketServer } from '@bolt-socket/server';
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

// 1. Define events
const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed'])
  })
});

// 2. Create Socket.IO server
const io = new Server(httpServer);

// 3. Create typed server wrapper
const server = createSocketServer({ events, io });

// 4. Emit type-safe events
server.emit('order.updated', {
  orderId: '123',
  status: 'completed'
});
```

## Features

- ✅ **Type-safe emit** - Full TypeScript inference from event registry
- ✅ **Automatic validation** - Zod validates payloads before emit
- ✅ **Unknown event prevention** - Runtime checks prevent invalid events
- ✅ **Clean abstraction** - Minimal wrapper over Socket.IO

## API

See [API Reference](../../API-REFERENCE.md) for complete documentation.
