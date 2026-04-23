/**
 * Example: React Integration - Complete Usage
 * 
 * Demonstrates:
 * - Setting up SocketProvider
 * - Using useSocketEvent in components
 * - Handling authentication
 * - Multiple listeners
 * - Cleanup and lifecycle
 */

import React, { useState } from 'react';
import { createEventRegistry } from '@bolt-socket/core';
import { SocketProvider, useSocketEvent, useSocket } from '@bolt-socket/react';
import { z } from 'zod';

// ============================================================================
// 1. Define Events (shared between client and server)
// ============================================================================

const events = createEventRegistry({
  'order.updated': z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    timestamp: z.number(),
  }),
  'user.connected': z.object({
    userId: z.string(),
    username: z.string(),
  }),
  'notification.sent': z.object({
    recipientId: z.string(),
    message: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  }),
  'chat.message': z.object({
    messageId: z.string(),
    userId: z.string(),
    text: z.string(),
    timestamp: z.number(),
  }),
});

// ============================================================================
// 2. Order Status Component - Basic Usage
// ============================================================================

function OrderStatusTracker({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>('pending');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // ✅ Type-safe event listener with automatic cleanup
  useSocketEvent('order.updated', (data) => {
    // data is fully typed with autocomplete
    if (data.orderId === orderId) {
      setStatus(data.status);
      setLastUpdate(data.timestamp);
    }
  }, [orderId]); // Resubscribe when orderId changes

  return (
    <div className="order-tracker">
      <h3>Order {orderId}</h3>
      <p>Status: <strong>{status}</strong></p>
      <p>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</p>
    </div>
  );
}

// ============================================================================
// 3. Notification Center - Multiple Event Listeners
// ============================================================================

interface Notification {
  id: string;
  message: string;
  priority: string;
  timestamp: number;
}

function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listen to notification events
  useSocketEvent('notification.sent', (data) => {
    const newNotification: Notification = {
      id: Math.random().toString(36),
      message: data.message,
      priority: data.priority,
      timestamp: Date.now(),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  });

  // Listen to user connection events
  useSocketEvent('user.connected', (data) => {
    const newNotification: Notification = {
      id: Math.random().toString(36),
      message: `${data.username} joined`,
      priority: 'low',
      timestamp: Date.now(),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  });

  return (
    <div className="notification-center">
      <h3>Notifications</h3>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul>
          {notifications.map(notif => (
            <li key={notif.id} className={`priority-${notif.priority}`}>
              {notif.message}
              <span className="time">
                {new Date(notif.timestamp).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// 4. Chat Component - Fresh Closures Demo
// ============================================================================

function ChatRoom() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    userId: string;
    text: string;
    timestamp: number;
  }>>([]);
  const [filter, setFilter] = useState<string>('');

  // Handler has access to latest state via closure
  useSocketEvent('chat.message', (data) => {
    // This always has access to the latest 'messages' state
    setMessages(prev => [...prev, {
      id: data.messageId,
      userId: data.userId,
      text: data.text,
      timestamp: data.timestamp,
    }]);
  });

  const filteredMessages = messages.filter(msg =>
    msg.text.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="chat-room">
      <h3>Chat Room</h3>
      <input
        type="text"
        placeholder="Filter messages..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="messages">
        {filteredMessages.map(msg => (
          <div key={msg.id} className="message">
            <strong>{msg.userId}:</strong> {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 5. Connection Status - Raw Socket Access
// ============================================================================

function ConnectionStatus() {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  React.useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="indicator">●</span>
      {isConnected ? 'Connected' : 'Disconnected'}
      {socket && <span className="socket-id"> ({socket.id})</span>}
    </div>
  );
}

// ============================================================================
// 6. Main App with SocketProvider
// ============================================================================

function Dashboard() {
  return (
    <div className="dashboard">
      <ConnectionStatus />
      <div className="grid">
        <OrderStatusTracker orderId="ORD-123" />
        <OrderStatusTracker orderId="ORD-456" />
        <NotificationCenter />
        <ChatRoom />
      </div>
    </div>
  );
}

// ============================================================================
// 7. App with Authentication
// ============================================================================

function App() {
  return (
    <SocketProvider
      url="http://localhost:3000"
      events={events}
      auth={() => ({
        // Auth function is called before connection
        token: localStorage.getItem('authToken') || 'anonymous',
        userId: localStorage.getItem('userId') || 'guest',
      })}
      options={{
        // Additional Socket.IO options
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      }}
    >
      <Dashboard />
    </SocketProvider>
  );
}

// ============================================================================
// 8. Alternative: Static Auth
// ============================================================================

function AppWithStaticAuth() {
  return (
    <SocketProvider
      url="http://localhost:3000"
      events={events}
      auth={{
        token: 'static-token-123',
        userId: 'user-456',
      }}
    >
      <Dashboard />
    </SocketProvider>
  );
}

// ============================================================================
// Example Notes
// ============================================================================

/**
 * Key Features Demonstrated:
 * 
 * ✅ Automatic cleanup - listeners removed on unmount
 * ✅ Type safety - full autocomplete on event names and payloads
 * ✅ Fresh closures - handlers always have latest state
 * ✅ Multiple listeners - same event in different components
 * ✅ Reconnection handling - listeners reattached automatically
 * ✅ Authentication - dynamic or static auth support
 * ✅ Dependency tracking - resubscribe when deps change
 * ✅ Raw socket access - when you need low-level control
 * 
 * Hidden Complexity Handled:
 * 
 * - No duplicate listeners (even with multiple components)
 * - Cleanup on unmount (no memory leaks)
 * - Reattach after reconnect (seamless recovery)
 * - Stale closures prevented (via ref pattern)
 * - Validation before handler call (runtime safety)
 */

export default App;
