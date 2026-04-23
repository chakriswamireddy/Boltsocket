# Examples

This directory contains comprehensive examples demonstrating all features of `@bolt-socket/core`.

## Running Examples

First, install dependencies from the root:

```bash
npm install
```

Then run examples:

```bash
# Run all examples
cd examples
npm run example:all

# Or run individually
npm run example:basic       # Basic usage patterns
npm run example:edge-cases  # Edge case handling
npm run example:types       # TypeScript type inference
```

## Examples Overview

### 1. basic-usage.ts

Demonstrates core functionality:
- Creating an event registry
- Type-safe schema access
- Runtime validation (success cases)
- Validation errors handling
- Complex nested schemas
- Type inference

**Key takeaways:**
- Full autocomplete on event names
- Payload types automatically inferred
- Runtime validation catches errors
- Clean error messages

### 2. server-usage.ts (Phase 2)

Demonstrates the Socket.IO server wrapper:
- Creating a typed Socket.IO server
- Type-safe event emission with validation
- Attaching to existing Socket.IO instances
- Error handling for invalid payloads
- Unknown event prevention
- Accessing internals (IO and registry)

**Key takeaways:**
- Validation happens before emit
- Unknown events caught at runtime
- Clean separation from Socket.IO internals
- Type safety propagates from registry to server

### 3. react-integration.tsx (Phase 3)

Complete full-stack React + Express example:
- Shared event registry between client and server
- Express server with Socket.IO
- React app with SocketProvider
- useSocketEvent hook usage
- Real-time order monitoring
- Connection status tracking
- Notification system

**Key takeaways:**
- Single source of truth for events
- Type safety across full stack
- Automatic cleanup in React
- Reconnection handling
- Zero boilerplate for consumers

### 4. dx-showcase.ts (Phase 4 - NEW!)

Developer Experience demonstration:
- Event name autocomplete in IDE
- Payload type inference from schemas
- Compile-time error detection
- IDE hover tooltips
- Safe refactoring examples
- Type extraction utilities
- IntelliSense features

**Key takeaways:**
- Strong typing prevents bugs
- IDE guides development
- Compile-time safety
- Documentation in types
- World-class DX

### 5. rooms-usage.ts (Phase 5 - NEW!)

Rooms & Targeted Messaging demonstration:
- User-specific notifications
- Order tracking with room subscriptions
- Private messaging between users
- Resource subscriptions (documents, etc.)
- Room management patterns
- API comparison (direct vs fluent)
- Room naming conventions
- Authorization patterns

**Key takeaways:**
- Targeted messaging without complexity
- Type-safe room emissions
- Production-ready patterns
- Clean abstraction over Socket.IO rooms
- Prevents event leakage

### 6. auth-usage.ts (Phase 6 - NEW!)

Connection & Auth Management demonstration:
- JWT token validation on connect
- User context attached to socket
- Token expiration monitoring
- Automatic token refresh
- Multi-tab session tracking
- Logout handling across tabs
- Edge case handling (expiry, reconnect, multiple tabs)
- Production security patterns

**Key takeaways:**
- Secure authentication middleware
- Reliable connection management
- Token lifecycle handling
- All edge cases covered
- Production-ready auth patterns

### 7. react-auth.tsx (Phase 6 - NEW!)

React client auth integration:
- Login/logout flow
- Token storage and management
- Auth provider with token refresh
- Connection lifecycle callbacks
- Session expiry handling
- Multi-tab coordination
- Graceful error handling
- Real-time dashboard example

**Key takeaways:**
- Frontend auth best practices
- User experience considerations
- Token refresh on reconnect
- Auth error handling
- Multi-tab session management

### 8. edge-cases.ts

Tests all edge cases:
- Invalid schema definitions
- Unknown event handling
- Invalid payload shapes
- Array validation (empty, too large, invalid items)
- Optional fields
- Union types
- Boundary value testing

**Key takeaways:**
- Comprehensive error handling
- Custom error types for better DX
- Validation catches all edge cases
- No crashes on invalid input

### 3. type-inference.ts

Advanced TypeScript patterns:
- Event name type extraction
- Payload type extraction
- Full event map types
- Generic event handler pattern
- Discriminated unions
- Type narrowing with validation

**Key takeaways:**
- Zero "any" types
- Full type safety end-to-end
- Type narrowing works perfectly
- Advanced patterns are possible

## Expected Output

All examples should run without errors. The output will show:
- ✅ for successful operations
- ❌ for expected failures (validation errors, edge cases)

## Learning Path

1. Start with `basic-usage.ts` to understand core concepts
2. Review `edge-cases.ts` to see error handling
3. Study `type-inference.ts` for advanced patterns

## Integration with Your App

Copy relevant patterns from these examples into your application. The event registry is designed to be:
- Minimal boilerplate
- Maximum type safety
- Explicit and predictable
