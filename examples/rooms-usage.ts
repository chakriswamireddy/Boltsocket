/**
 * Example: Rooms & Targeted Messaging (Phase 5)
 * 
 * Demonstrates how to use rooms for scoped communication:
 * - User-specific notifications
 * - Order tracking
 * - Private messaging
 * - Resource subscriptions
 */

import { z } from 'zod';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer } from '@bolt-socket/server';

// Define events for real-world scenarios
const events = createEventRegistry({
  // Order events
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    timestamp: z.number(),
  }),
  
  // User notifications
  'notification': z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'warning', 'error']),
    timestamp: z.number(),
  }),
  
  // Private messages
  'message.private': z.object({
    from: z.string(),
    to: z.string(),
    content: z.string(),
    timestamp: z.number(),
  }),
  
  // Resource updates
  'resource.updated': z.object({
    resourceType: z.string(),
    resourceId: z.string(),
    changes: z.record(z.any()),
  }),
});

// Create HTTP server and Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// Create typed socket server
const server = createSocketServer({ events, io });

// ============================================
// Example 1: User-Specific Notifications
// ============================================

io.on('connection', (socket) => {
  console.log(`\n✅ Client connected: ${socket.id}`);
  
  // Join user to their personal notification room
  const userId = socket.handshake.query.userId as string || 'guest';
  const userRoom = `user:${userId}`;
  
  server.joinRoom(socket.id, userRoom);
  console.log(`📢 User ${userId} joined room: ${userRoom}`);
  
  // Send welcome notification to just this user
  server.toRoom(userRoom).emit('notification', {
    message: `Welcome, ${userId}!`,
    type: 'success',
    timestamp: Date.now(),
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ============================================
// Example 2: Order Tracking
// ============================================

// Simulate order subscription
function subscribeToOrder(socketId: string, orderId: string) {
  try {
    const orderRoom = `order:${orderId}`;
    server.joinRoom(socketId, orderRoom);
    console.log(`\n📦 Socket ${socketId} subscribed to ${orderRoom}`);
    
    // Send initial order status
    server.toRoom(orderRoom).emit('order.updated', {
      orderId,
      status: 'pending',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Failed to subscribe:', error.message);
  }
}

// Simulate order status update (backend process)
function updateOrderStatus(orderId: string, status: 'pending' | 'processing' | 'completed' | 'cancelled') {
  try {
    const orderRoom = `order:${orderId}`;
    
    // Only users subscribed to this order will receive the update
    server.emitToRoom(orderRoom, 'order.updated', {
      orderId,
      status,
      timestamp: Date.now(),
    });
    
    console.log(`\n📊 Order ${orderId} updated to: ${status}`);
    console.log(`   Notified room: ${orderRoom}`);
  } catch (error) {
    console.error('❌ Failed to update order:', error.message);
  }
}

// ============================================
// Example 3: Private Messaging
// ============================================

// Send private message between users
function sendPrivateMessage(fromUserId: string, toUserId: string, content: string) {
  try {
    const recipientRoom = `user:${toUserId}`;
    
    // Message goes only to recipient's room
    server.toRoom(recipientRoom).emit('message.private', {
      from: fromUserId,
      to: toUserId,
      content,
      timestamp: Date.now(),
    });
    
    console.log(`\n💬 Private message from ${fromUserId} to ${toUserId}`);
    console.log(`   Content: "${content}"`);
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
  }
}

// ============================================
// Example 4: Resource Subscriptions
// ============================================

// Multiple users can subscribe to a shared resource
function subscribeToResource(socketId: string, resourceType: string, resourceId: string) {
  try {
    const resourceRoom = `${resourceType}:${resourceId}`;
    server.joinRoom(socketId, resourceRoom);
    console.log(`\n🔔 Socket ${socketId} watching ${resourceRoom}`);
  } catch (error) {
    console.error('❌ Failed to subscribe to resource:', error.message);
  }
}

// Notify all subscribers when resource changes
function notifyResourceUpdate(resourceType: string, resourceId: string, changes: Record<string, any>) {
  try {
    const resourceRoom = `${resourceType}:${resourceId}`;
    
    server.toRoom(resourceRoom).emit('resource.updated', {
      resourceType,
      resourceId,
      changes,
    });
    
    console.log(`\n🔄 Resource updated: ${resourceRoom}`);
    console.log(`   Changes:`, changes);
  } catch (error) {
    console.error('❌ Failed to notify resource update:', error.message);
  }
}

// ============================================
// Example 5: Room Management Patterns
// ============================================

// Pattern: Unsubscribe from order when complete
function handleOrderCompletion(socketId: string, orderId: string) {
  try {
    const orderRoom = `order:${orderId}`;
    
    // Send final update
    server.toRoom(orderRoom).emit('order.updated', {
      orderId,
      status: 'completed',
      timestamp: Date.now(),
    });
    
    // Auto-unsubscribe user
    server.leaveRoom(socketId, orderRoom);
    console.log(`\n✅ Order ${orderId} completed, user unsubscribed`);
  } catch (error) {
    console.error('❌ Failed to complete order:', error.message);
  }
}

// Pattern: Bulk notification to multiple rooms
function notifyMultipleRooms(roomNames: string[], message: string) {
  try {
    roomNames.forEach(roomName => {
      server.toRoom(roomName).emit('notification', {
        message,
        type: 'info',
        timestamp: Date.now(),
      });
    });
    
    console.log(`\n📣 Broadcast to ${roomNames.length} rooms:`);
    console.log(`   Message: "${message}"`);
  } catch (error) {
    console.error('❌ Failed to broadcast:', error.message);
  }
}

// ============================================
// Example 6: Fluent API vs Direct API
// ============================================

function demonstrateAPIs(orderId: string) {
  console.log('\n=== API Comparison ===');
  
  // Direct API - good for single emissions
  console.log('\n1. Direct API:');
  server.emitToRoom(`order:${orderId}`, 'order.updated', {
    orderId,
    status: 'processing',
    timestamp: Date.now(),
  });
  
  // Fluent API - cleaner for multiple emissions
  console.log('\n2. Fluent API:');
  const orderRoom = server.toRoom(`order:${orderId}`);
  orderRoom.emit('order.updated', {
    orderId,
    status: 'processing',
    timestamp: Date.now(),
  });
  orderRoom.emit('notification', {
    message: 'Order is being processed',
    type: 'info',
    timestamp: Date.now(),
  });
}

// ============================================
// Run Demonstrations
// ============================================

console.log('=== BoltSocket Rooms & Targeted Messaging Examples ===');

// Start server
httpServer.listen(3000, () => {
  console.log('\n🚀 Server listening on port 3000');
  console.log('   Connect clients with: ?userId=<your-id>');
  
  // Simulate scenarios after a short delay
  setTimeout(() => {
    console.log('\n\n=== Running Demonstrations ===');
    
    // Demo 1: Order tracking
    console.log('\n--- Demo 1: Order Tracking ---');
    updateOrderStatus('ORD-123', 'processing');
    setTimeout(() => updateOrderStatus('ORD-123', 'completed'), 2000);
    
    // Demo 2: Private messaging
    setTimeout(() => {
      console.log('\n--- Demo 2: Private Messaging ---');
      sendPrivateMessage('alice', 'bob', 'Hey Bob! How are you?');
      sendPrivateMessage('bob', 'alice', 'Doing great, thanks!');
    }, 3000);
    
    // Demo 3: Resource subscriptions
    setTimeout(() => {
      console.log('\n--- Demo 3: Resource Updates ---');
      notifyResourceUpdate('document', 'DOC-456', {
        title: 'Updated Title',
        lastModified: Date.now(),
      });
    }, 5000);
    
    // Demo 4: Bulk notifications
    setTimeout(() => {
      console.log('\n--- Demo 4: Bulk Notifications ---');
      notifyMultipleRooms(
        ['user:alice', 'user:bob', 'user:charlie'],
        'System maintenance in 5 minutes'
      );
    }, 7000);
    
    // Demo 5: API comparison
    setTimeout(() => {
      console.log('\n--- Demo 5: API Styles ---');
      demonstrateAPIs('ORD-789');
    }, 9000);
  }, 1000);
});

// ============================================
// Key Takeaways
// ============================================

/*
 * Room Naming Conventions:
 * - user:{userId}      → Personal notifications
 * - order:{orderId}    → Order-specific updates
 * - {type}:{id}        → Generic resource pattern
 * - chat:{chatId}      → Group conversations
 * 
 * Best Practices:
 * 1. ✅ Use descriptive room names (e.g., 'user:123' not just '123')
 * 2. ✅ Clean up rooms when they're no longer needed
 * 3. ✅ Validate room access on connection
 * 4. ✅ Use fluent API for multiple emissions to same room
 * 5. ✅ Handle socket disconnection gracefully
 * 
 * Common Patterns:
 * - Personal rooms: One user, private updates
 * - Resource rooms: Multiple users, shared updates
 * - Temporary rooms: Auto-cleanup after completion
 * - Hierarchical rooms: user:123, user:123:orders
 * 
 * Type Safety:
 * - Event names autocomplete ✅
 * - Payloads are validated ✅
 * - Runtime errors for invalid events ✅
 * - IDE shows full event signatures ✅
 */
