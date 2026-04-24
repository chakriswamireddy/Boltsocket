# @bolt-socket/core

Core event registry, type system, logger, and tracer for bolt-socket.

## Installation

```bash
pnpm add @bolt-socket/core zod
```

## Usage

```ts
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'shipped', 'delivered']),
  }),
});

// Validate without throwing
const result = events.validate('order.updated', { orderId: '1', status: 'shipped' });
if (result.success) console.log(result.data.status);

// Parse (throws ValidationError on failure)
const data = events.parse('order.updated', payload);

// Introspect
events.hasEvent('order.updated');   // true
events.getEventNames();             // ['order.updated']
events.getSchema('order.updated');  // ZodObject
events.getSchemaMap();              // Readonly<{ 'order.updated': ZodObject }>
```

## Observability

```ts
import { enableDebugLogs, enableEventTracing, onEventTraced } from '@bolt-socket/core';

// Activate logging (silent by default)
enableDebugLogs({ level: 'info', categories: ['connection', 'auth'] });

// Activate event tracing
enableEventTracing();
onEventTraced((trace) => {
  if (!trace.validated) console.error('Validation failed', trace.eventName);
});
```

## License

MIT
