import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

// ============================================
// Example 1: Basic Event Registry
// ============================================
console.log('=== Example 1: Basic Event Registry ===\n');

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'completed', 'cancelled']),
    amount: z.number().positive(),
  }),
  'user.connected': z.object({
    userId: z.string(),
    timestamp: z.number(),
    metadata: z.record(z.string()).optional(),
  }),
  'message.sent': z.object({
    messageId: z.string(),
    text: z.string().min(1).max(500),
    senderId: z.string(),
    receiverId: z.string(),
  }),
});

// ✅ Type-safe schema access
const orderSchema = events.getSchema('order.updated');
console.log('✅ Retrieved order.updated schema:', orderSchema._def.typeName);

// ✅ Get all event names
const allEvents = events.getEventNames();
console.log('✅ All registered events:', allEvents);

// ✅ Check if event exists
console.log('✅ Has "order.updated":', events.hasEvent('order.updated'));
console.log('✅ Has "invalid.event":', events.hasEvent('invalid.event'));

// ============================================
// Example 2: Runtime Validation (Success)
// ============================================
console.log('\n=== Example 2: Runtime Validation (Success) ===\n');

const validOrder = {
  orderId: 'ORD-123',
  status: 'completed' as const,
  amount: 99.99,
};

const validationResult = events.validate('order.updated', validOrder);
if (validationResult.success) {
  console.log('✅ Validation passed:', validationResult.data);
  // TypeScript knows the exact shape of validationResult.data
  console.log('   Order ID:', validationResult.data.orderId);
  console.log('   Status:', validationResult.data.status);
  console.log('   Amount:', validationResult.data.amount);
}

// Using parse (throws on error)
try {
  const parsed = events.parse('user.connected', {
    userId: 'USER-456',
    timestamp: Date.now(),
  });
  console.log('✅ Parse successful:', parsed);
} catch (error) {
  console.error('❌ Parse failed:', error);
}

// ============================================
// Example 3: Validation Errors
// ============================================
console.log('\n=== Example 3: Validation Errors ===\n');

// Invalid payload shape
const invalidOrder = {
  orderId: 'ORD-789',
  status: 'invalid_status', // ❌ Not in enum
  amount: -50, // ❌ Negative number
};

const failedValidation = events.validate('order.updated', invalidOrder);
if (!failedValidation.success) {
  console.log('❌ Validation failed as expected:');
  failedValidation.error.issues.forEach((issue) => {
    console.log(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
}

// Missing required fields
const incompleteMessage = {
  messageId: 'MSG-001',
  text: 'Hello',
  // Missing senderId and receiverId
};

const failedValidation2 = events.validate('message.sent', incompleteMessage);
if (!failedValidation2.success) {
  console.log('❌ Validation failed for incomplete message:');
  failedValidation2.error.issues.forEach((issue) => {
    console.log(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
}

// ============================================
// Example 4: Unknown Event Handling
// ============================================
console.log('\n=== Example 4: Unknown Event Handling ===\n');

try {
  // @ts-expect-error - Testing runtime error for unknown event
  events.getSchema('unknown.event');
} catch (error) {
  console.log('❌ Caught unknown event error:', error.message);
}

const unknownEventValidation = events.validate(
  'not.registered' as any,
  { data: 'test' }
);
if (!unknownEventValidation.success) {
  console.log('❌ Unknown event validation failed:', unknownEventValidation.error.issues[0].message);
}

// ============================================
// Example 5: Complex Nested Schemas
// ============================================
console.log('\n=== Example 5: Complex Nested Schemas ===\n');

const complexEvents = createEventRegistry({
  'order.created': z.object({
    order: z.object({
      id: z.string().uuid(),
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
        })
      ).min(1),
      customer: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string().min(1),
      }),
      shipping: z.object({
        address: z.string(),
        city: z.string(),
        postalCode: z.string().regex(/^\d{5}$/),
      }),
    }),
    timestamp: z.number(),
  }),
});

const complexOrder = {
  order: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    items: [
      { productId: 'PROD-1', quantity: 2, price: 29.99 },
      { productId: 'PROD-2', quantity: 1, price: 49.99 },
    ],
    customer: {
      id: 'CUST-123',
      email: 'customer@example.com',
      name: 'John Doe',
    },
    shipping: {
      address: '123 Main St',
      city: 'New York',
      postalCode: '10001',
    },
  },
  timestamp: Date.now(),
};

const complexValidation = complexEvents.validate('order.created', complexOrder);
if (complexValidation.success) {
  console.log('✅ Complex nested validation passed');
  console.log('   Items count:', complexValidation.data.order.items.length);
  console.log('   Customer:', complexValidation.data.order.customer.name);
}

// ============================================
// Example 6: Type Inference Demo
// ============================================
console.log('\n=== Example 6: Type Inference ===\n');

// Extract types from registry
type OrderUpdatedPayload = z.infer<typeof orderSchema>;
type AllEventTypes = typeof events;

console.log('✅ TypeScript types are fully inferred');
console.log('   - Event names have autocomplete');
console.log('   - Payload types are narrowed correctly');
console.log('   - No "any" types in the API');

// ============================================
// Example 7: Edge Cases
// ============================================
console.log('\n=== Example 7: Edge Cases ===\n');

// Empty object validation
const emptyValidation = events.validate('order.updated', {});
if (!emptyValidation.success) {
  console.log('❌ Empty object validation failed (expected):');
  console.log('   Errors:', emptyValidation.error.issues.length);
}

// Null/undefined payload
const nullValidation = events.validate('order.updated', null);
if (!nullValidation.success) {
  console.log('❌ Null payload validation failed (expected)');
}

// Extra fields (Zod default is to strip them)
const extraFields = {
  orderId: 'ORD-999',
  status: 'pending' as const,
  amount: 150,
  extraField: 'this will be stripped',
};

const extraFieldsResult = events.validate('order.updated', extraFields);
if (extraFieldsResult.success) {
  console.log('✅ Extra fields handled:', Object.keys(extraFieldsResult.data));
  console.log('   (Extra field was stripped by Zod)');
}

console.log('\n=== All Examples Completed ===');
