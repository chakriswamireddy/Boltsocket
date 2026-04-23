import { createEventRegistry, InvalidSchemaError } from '@bolt-socket/core';
import { z } from 'zod';

// ============================================
// Edge Case 1: Invalid Schema Definition
// ============================================
console.log('=== Edge Case 1: Invalid Schema Definition ===\n');

// Test: Empty schema
try {
  const emptyRegistry = createEventRegistry({});
  console.log('❌ Should have thrown error for empty schema');
} catch (error) {
  if (error instanceof InvalidSchemaError) {
    console.log('✅ Empty schema rejected:', error.message);
  }
}

// Test: Null schema
try {
  const nullRegistry = createEventRegistry(null as any);
  console.log('❌ Should have thrown error for null schema');
} catch (error) {
  if (error instanceof InvalidSchemaError) {
    console.log('✅ Null schema rejected:', error.message);
  }
}

// Test: Non-Zod schema value
try {
  const invalidRegistry = createEventRegistry({
    'test.event': 'not a schema' as any,
  });
  console.log('❌ Should have thrown error for non-Zod value');
} catch (error) {
  if (error instanceof InvalidSchemaError) {
    console.log('✅ Non-Zod schema rejected:', error.message);
  }
}

// Test: Empty event name
try {
  const emptyNameRegistry = createEventRegistry({
    '': z.object({ data: z.string() }),
  });
  console.log('❌ Should have thrown error for empty event name');
} catch (error) {
  if (error instanceof InvalidSchemaError) {
    console.log('✅ Empty event name rejected:', error.message);
  }
}

// ============================================
// Edge Case 2: Unknown Event Access
// ============================================
console.log('\n=== Edge Case 2: Unknown Event Access ===\n');

const events = createEventRegistry({
  'known.event': z.object({ id: z.string() }),
});

// getSchema with unknown event
try {
  events.getSchema('unknown.event' as any);
  console.log('❌ Should have thrown error');
} catch (error) {
  console.log('✅ Unknown event in getSchema:', error.message);
}

// parse with unknown event
try {
  events.parse('unknown.event' as any, { id: '123' });
  console.log('❌ Should have thrown error');
} catch (error) {
  console.log('✅ Unknown event in parse:', error.message);
}

// validate with unknown event (returns error result, doesn't throw)
const result = events.validate('unknown.event' as any, { id: '123' });
if (!result.success) {
  console.log('✅ Unknown event in validate:', result.error.issues[0].message);
}

// ============================================
// Edge Case 3: Invalid Payload Shapes
// ============================================
console.log('\n=== Edge Case 3: Invalid Payload Shapes ===\n');

const strictEvents = createEventRegistry({
  'user.created': z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  }),
});

// Test: Wrong types
const wrongTypes = {
  id: 123, // Should be string
  email: 'not-an-email', // Invalid email format
  age: 'twenty', // Should be number
};

const result1 = strictEvents.validate('user.created', wrongTypes);
if (!result1.success) {
  console.log('❌ Wrong types validation failed (expected):');
  result1.error.issues.forEach(issue => {
    console.log(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
}

// Test: Missing required fields
const missingFields = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  // Missing email and age
};

const result2 = strictEvents.validate('user.created', missingFields);
if (!result2.success) {
  console.log('❌ Missing fields validation failed (expected):');
  result2.error.issues.forEach(issue => {
    console.log(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
}

// Test: Boundary values
const boundaryTest1 = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  age: -1, // Below minimum
};

const result3 = strictEvents.validate('user.created', boundaryTest1);
if (!result3.success) {
  console.log('❌ Negative age validation failed (expected):');
  console.log(`   - ${result3.error.issues[0].message}`);
}

const boundaryTest2 = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  age: 200, // Above maximum
};

const result4 = strictEvents.validate('user.created', boundaryTest2);
if (!result4.success) {
  console.log('❌ Age too high validation failed (expected):');
  console.log(`   - ${result4.error.issues[0].message}`);
}

// Test: Null and undefined values
const nullValues = {
  id: null,
  email: undefined,
  age: null,
};

const result5 = strictEvents.validate('user.created', nullValues);
if (!result5.success) {
  console.log('❌ Null/undefined values failed (expected):');
  console.log(`   - Errors: ${result5.error.issues.length}`);
}

// ============================================
// Edge Case 4: Array and Nested Validation
// ============================================
console.log('\n=== Edge Case 4: Array and Nested Validation ===\n');

const nestedEvents = createEventRegistry({
  'cart.updated': z.object({
    items: z.array(
      z.object({
        id: z.string(),
        quantity: z.number().positive(),
      })
    ).min(1).max(10),
  }),
});

// Empty array (below minimum)
const emptyArray = { items: [] };
const result6 = nestedEvents.validate('cart.updated', emptyArray);
if (!result6.success) {
  console.log('❌ Empty array failed (expected):', result6.error.issues[0].message);
}

// Too many items
const tooManyItems = {
  items: Array(15).fill({ id: 'ITEM-1', quantity: 1 }),
};
const result7 = nestedEvents.validate('cart.updated', tooManyItems);
if (!result7.success) {
  console.log('❌ Too many items failed (expected):', result7.error.issues[0].message);
}

// Invalid item in array
const invalidItem = {
  items: [
    { id: 'ITEM-1', quantity: 1 },
    { id: 'ITEM-2', quantity: -5 }, // Invalid quantity
  ],
};
const result8 = nestedEvents.validate('cart.updated', invalidItem);
if (!result8.success) {
  console.log('❌ Invalid array item failed (expected):');
  console.log(`   - ${result8.error.issues[0].path.join('.')}: ${result8.error.issues[0].message}`);
}

// ============================================
// Edge Case 5: Optional Fields
// ============================================
console.log('\n=== Edge Case 5: Optional Fields ===\n');

const optionalEvents = createEventRegistry({
  'profile.updated': z.object({
    userId: z.string(),
    name: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});

// All optional fields omitted
const minimalProfile = { userId: 'USER-123' };
const result9 = optionalEvents.validate('profile.updated', minimalProfile);
if (result9.success) {
  console.log('✅ Minimal profile with optional fields omitted:', result9.data);
}

// Optional field with invalid value
const invalidOptional = {
  userId: 'USER-123',
  avatar: 'not-a-url', // Invalid URL
};
const result10 = optionalEvents.validate('profile.updated', invalidOptional);
if (!result10.success) {
  console.log('❌ Invalid optional field failed (expected):', result10.error.issues[0].message);
}

// ============================================
// Edge Case 6: Union and Discriminated Types
// ============================================
console.log('\n=== Edge Case 6: Union Types ===\n');

const unionEvents = createEventRegistry({
  'notification.sent': z.object({
    type: z.enum(['email', 'sms', 'push']),
    recipient: z.string(),
    content: z.union([
      z.object({ subject: z.string(), body: z.string() }), // email
      z.object({ message: z.string() }), // sms/push
    ]),
  }),
});

const emailNotification = {
  type: 'email' as const,
  recipient: 'user@example.com',
  content: { subject: 'Hello', body: 'World' },
};

const result11 = unionEvents.validate('notification.sent', emailNotification);
if (result11.success) {
  console.log('✅ Email notification validated:', result11.data.type);
}

const smsNotification = {
  type: 'sms' as const,
  recipient: '+1234567890',
  content: { message: 'Hello via SMS' },
};

const result12 = unionEvents.validate('notification.sent', smsNotification);
if (result12.success) {
  console.log('✅ SMS notification validated:', result12.data.type);
}

console.log('\n=== All Edge Cases Tested ===');
