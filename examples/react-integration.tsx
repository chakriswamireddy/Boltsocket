/**
 * Example: Full React + Express Integration
 * 
 * Demonstrates a complete real-time application with:
 * - Express server with Socket.IO
 * - React app with useSocketEvent
 * - Type-safe events across frontend and backend
 */

import { z } from 'zod';
import { createEventRegistry } from '@bolt-socket/core';

// ============================================================================
// SHARED: Event Registry (used by both client and server)
// ============================================================================

export const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    timestamp: z.number(),
  }),
  'order.created': z.object({
    orderId: z.string(),
    userId: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
    })),
    total: z.number(),
  }),
  'user.connected': z.object({
    userId: z.string(),
    username: z.string(),
  }),
  'notification': z.object({
    type: z.enum(['success', 'info', 'warning', 'error']),
    message: z.string(),
  }),
});

// ============================================================================
// SERVER: Express + Socket.IO (run this in server.ts)
// ============================================================================

/*
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createSocketServer } from '@bolt-socket/server';
import { events } from './shared-events';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Create typed socket server
const socketServer = createSocketServer({ events, io });

// Handle connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send welcome notification
  socketServer.emit('notification', {
    type: 'info',
    message: 'Connected to server'
  });

  // Emit user connected event
  socketServer.emit('user.connected', {
    userId: socket.id,
    username: 'Anonymous'
  });
});

// Simulate order updates every 3 seconds
setInterval(() => {
  const statuses = ['pending', 'processing', 'completed', 'cancelled'] as const;
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  socketServer.emit('order.updated', {
    orderId: `ORD-${Math.floor(Math.random() * 1000)}`,
    status: randomStatus,
    timestamp: Date.now(),
  });
}, 3000);

httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
*/

// ============================================================================
// CLIENT: React App (App.tsx)
// ============================================================================

/*
import React, { useState } from 'react';
import { SocketProvider, useSocketEvent } from '@bolt-socket/react';
import { events } from './shared-events';

// Component that listens to order updates
function OrderMonitor() {
  const [latestOrder, setLatestOrder] = useState<{
    orderId: string;
    status: string;
    timestamp: number;
  } | null>(null);

  const [orderHistory, setOrderHistory] = useState<Array<{
    orderId: string;
    status: string;
    timestamp: number;
  }>>([]);

  // ✅ Type-safe event listener with automatic cleanup
  useSocketEvent('order.updated', (data) => {
    console.log('Order updated:', data);
    setLatestOrder(data);
    setOrderHistory(prev => [data, ...prev].slice(0, 10));
  });

  return (
    <div>
      <h2>Order Monitor</h2>
      
      {latestOrder && (
        <div style={{ 
          padding: '1rem', 
          background: '#f0f0f0', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h3>Latest Order</h3>
          <p><strong>ID:</strong> {latestOrder.orderId}</p>
          <p><strong>Status:</strong> {latestOrder.status}</p>
          <p><strong>Time:</strong> {new Date(latestOrder.timestamp).toLocaleTimeString()}</p>
        </div>
      )}

      <h3>Recent Updates</h3>
      <ul>
        {orderHistory.map((order, idx) => (
          <li key={idx}>
            {order.orderId} - {order.status} - {new Date(order.timestamp).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Component that shows notifications
function NotificationDisplay() {
  const [notifications, setNotifications] = useState<Array<{
    type: string;
    message: string;
    id: number;
  }>>([]);

  useSocketEvent('notification', (data) => {
    const newNotification = {
      ...data,
      id: Date.now(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  });

  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', width: '300px' }}>
      {notifications.map(notif => (
        <div
          key={notif.id}
          style={{
            padding: '1rem',
            marginBottom: '0.5rem',
            background: notif.type === 'success' ? '#d4edda' : '#d1ecf1',
            border: '1px solid',
            borderColor: notif.type === 'success' ? '#c3e6cb' : '#bee5eb',
            borderRadius: '4px',
          }}
        >
          <strong>{notif.type.toUpperCase()}:</strong> {notif.message}
        </div>
      ))}
    </div>
  );
}

// Component that displays connection status
function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useSocketEvent('user.connected', (data) => {
    setIsConnected(true);
    console.log('User connected:', data);
  });

  return (
    <div style={{ 
      padding: '0.5rem 1rem', 
      background: isConnected ? '#d4edda' : '#f8d7da',
      borderBottom: '1px solid #ccc'
    }}>
      Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}

// Main App component
function App() {
  return (
    <SocketProvider url="http://localhost:3000" events={events}>
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <ConnectionStatus />
        <NotificationDisplay />
        
        <div style={{ padding: '2rem' }}>
          <h1>BoltSocket React Example</h1>
          <p>This app demonstrates real-time event handling with type safety.</p>
          <OrderMonitor />
        </div>
      </div>
    </SocketProvider>
  );
}

export default App;
*/

console.log('✅ See comments above for complete React + Express example');
console.log('📦 This demonstrates:');
console.log('   - Shared event registry');
console.log('   - Type-safe server emit');
console.log('   - Type-safe React hooks');
console.log('   - Automatic cleanup');
console.log('   - Real-time updates');
