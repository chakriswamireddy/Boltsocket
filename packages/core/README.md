# @bolt-socket/core

Core event registry and type system for bolt-socket.

## Installation

```bash
npm install @bolt-socket/core zod
```

## Usage

```typescript
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed'])
  })
});

// Full type inference
type Events = typeof events;
// Autocomplete on event names
// Runtime validation included
```

## API

### `createEventRegistry(schema)`

Creates a type-safe event registry with runtime validation.

**Parameters:**
- `schema`: Object mapping event names to Zod schemas

**Returns:**
- Event registry with type inference and validation

## License

MIT
