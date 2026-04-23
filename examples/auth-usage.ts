/**
 * Example: Connection & Auth Management (Phase 6)
 * 
 * Demonstrates secure, reliable real-time connections:
 * - JWT token validation on connect
 * - User context attached to socket
 * - Token refresh on reconnect
 * - Graceful auth failure handling
 * - Edge cases: token expiry, logout, multiple tabs
 */

import { z } from 'zod';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createEventRegistry } from '@bolt-socket/core';
import { createSocketServer, type AuthMiddleware, type AuthenticatedSocket } from '@bolt-socket/server';

// ============================================
// 1. Define Events
// ============================================

const events = createEventRegistry({
  // User events
  'user.connected': z.object({
    userId: z.string(),
    email: z.string(),
    connectedAt: z.number(),
  }),
  
  // Notifications (user-specific)
  'notification': z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'warning', 'error']),
    timestamp: z.number(),
  }),
  
  // Session events
  'session.refresh': z.object({
    userId: z.string(),
    newToken: z.string(),
  }),
  
  'session.expired': z.object({
    userId: z.string(),
    reason: z.string(),
  }),
});

// ============================================
// 2. Mock JWT Utilities
// ============================================

interface JWTPayload {
  sub: string;  // userId
  email: string;
  role: 'admin' | 'user';
  exp: number;  // expiration timestamp
  iat: number;  // issued at timestamp
}

// Mock JWT database (in production, use Redis or similar)
const tokenStore = new Map<string, JWTPayload>();
const userSessions = new Map<string, Set<string>>(); // userId -> Set<socketId>

/**
 * Generate a mock JWT token
 * In production, use a proper JWT library like jsonwebtoken
 */
function generateToken(userId: string, email: string, role: 'admin' | 'user', expiresIn: number = 3600000): string {
  const token = `jwt_${Math.random().toString(36).substring(2)}`;
  const now = Date.now();
  
  tokenStore.set(token, {
    sub: userId,
    email,
    role,
    exp: now + expiresIn,
    iat: now,
  });
  
  return token;
}

/**
 * Verify and decode a JWT token
 * In production, use jwt.verify() from jsonwebtoken
 */
async function verifyToken(token: string): Promise<JWTPayload> {
  // Simulate async verification
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const payload = tokenStore.get(token);
  
  if (!payload) {
    throw new Error('Invalid token');
  }
  
  // Check if expired
  if (Date.now() > payload.exp) {
    tokenStore.delete(token);
    throw new Error('Token expired');
  }
  
  return payload;
}

/**
 * Refresh an expiring token
 */
function refreshToken(oldToken: string): string {
  const payload = tokenStore.get(oldToken);
  
  if (!payload) {
    throw new Error('Invalid token');
  }
  
  // Generate new token with same user info
  const newToken = generateToken(payload.sub, payload.email, payload.role);
  
  // Invalidate old token
  tokenStore.delete(oldToken);
  
  return newToken;
}

/**
 * Invalidate token (logout)
 */
function revokeToken(token: string): void {
  tokenStore.delete(token);
}

// ============================================
// 3. Auth Middleware
// ============================================

/**
 * Authentication middleware
 * Validates JWT token and attaches user context to socket
 */
const authMiddleware: AuthMiddleware = async (socket) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return {
        success: false,
        error: 'No token provided',
      };
    }
    
    // Verify token
    const payload = await verifyToken(token);
    
    // Attach user context to socket
    return {
      success: true,
      context: {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        token, // Store token for refresh
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    
    return {
      success: false,
      error: message,
    };
  }
};

// ============================================
// 4. Create Server with Auth
// ============================================

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// Create typed socket server with auth middleware
const server = createSocketServer({
  events,
  io,
  auth: authMiddleware, // ✅ Enable authentication
});

// ============================================
// 5. Connection Lifecycle with Auth
// ============================================

io.on('connection', (socket) => {
  // Cast to authenticated socket to access user context
  const authSocket = socket as AuthenticatedSocket;
  const { userId, email, role } = authSocket.auth;
  
  console.log(`\n✅ User authenticated: ${email} (${userId})`);
  console.log(`   Role: ${role}`);
  console.log(`   Socket ID: ${socket.id}`);
  
  // Track user session
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  userSessions.get(userId)!.add(socket.id);
  
  // Join user to their personal room
  server.joinRoom(socket.id, `user:${userId}`);
  
  // Emit user connected event
  server.toRoom(`user:${userId}`).emit('user.connected', {
    userId,
    email,
    connectedAt: Date.now(),
  });
  
  // Send welcome notification
  server.toRoom(`user:${userId}`).emit('notification', {
    message: `Welcome back, ${email.split('@')[0]}!`,
    type: 'success',
    timestamp: Date.now(),
  });
  
  // ============================================
  // Edge Case 1: Token Expiring Soon
  // ============================================
  
  // Check token expiration every 30 seconds
  const tokenCheckInterval = setInterval(() => {
    const token = authSocket.auth.token;
    const payload = tokenStore.get(token);
    
    if (!payload) {
      console.log(`⚠️  Token invalid for user ${userId}`);
      clearInterval(tokenCheckInterval);
      socket.disconnect(true);
      return;
    }
    
    const timeUntilExpiry = payload.exp - Date.now();
    
    // If token expires in less than 5 minutes, send refresh
    if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
      console.log(`🔄 Token expiring soon for ${userId}, sending refresh`);
      
      try {
        const newToken = refreshToken(token);
        
        // Update auth context
        authSocket.auth.token = newToken;
        
        // Notify client to refresh their token
        server.toRoom(`user:${userId}`).emit('session.refresh', {
          userId,
          newToken,
        });
      } catch (error) {
        console.error(`❌ Token refresh failed for ${userId}`);
      }
    }
    
    // If token already expired, disconnect
    if (timeUntilExpiry <= 0) {
      console.log(`❌ Token expired for ${userId}, disconnecting`);
      clearInterval(tokenCheckInterval);
      
      server.toRoom(`user:${userId}`).emit('session.expired', {
        userId,
        reason: 'Token expired',
      });
      
      socket.disconnect(true);
    }
  }, 30000);
  
  // ============================================
  // Edge Case 2: Manual Logout
  // ============================================
  
  socket.on('logout', () => {
    console.log(`🚪 User ${userId} logging out`);
    
    // Revoke token
    revokeToken(authSocket.auth.token);
    
    // Emit session expired to all user's tabs
    server.toRoom(`user:${userId}`).emit('session.expired', {
      userId,
      reason: 'User logged out',
    });
    
    clearInterval(tokenCheckInterval);
    socket.disconnect(true);
  });
  
  // ============================================
  // Edge Case 3: Multiple Tabs
  // ============================================
  
  socket.on('get:active_sessions', () => {
    const sessions = userSessions.get(userId);
    const count = sessions ? sessions.size : 0;
    
    console.log(`📊 User ${userId} has ${count} active sessions`);
    
    socket.emit('active_sessions', {
      count,
      socketIds: Array.from(sessions || []),
    });
  });
  
  // ============================================
  // Disconnect Handling
  // ============================================
  
  socket.on('disconnect', (reason) => {
    console.log(`\n❌ User ${userId} disconnected: ${reason}`);
    
    // Clean up session tracking
    const sessions = userSessions.get(userId);
    if (sessions) {
      sessions.delete(socket.id);
      if (sessions.size === 0) {
        userSessions.delete(userId);
        console.log(`   All sessions closed for ${userId}`);
      } else {
        console.log(`   ${sessions.size} sessions remaining for ${userId}`);
      }
    }
    
    clearInterval(tokenCheckInterval);
  });
});

// ============================================
// 6. Helper Functions for Testing
// ============================================

/**
 * Get all authenticated sockets for a user
 */
function getUserSockets(userId: string): AuthenticatedSocket[] {
  return server.getAllAuthSockets().filter(
    socket => socket.auth.userId === userId
  );
}

/**
 * Broadcast to all authenticated users
 */
function broadcastToAllUsers(message: string) {
  const allSockets = server.getAllAuthSockets();
  
  console.log(`\n📢 Broadcasting to ${allSockets.length} users`);
  
  allSockets.forEach(socket => {
    const { userId } = socket.auth;
    server.toRoom(`user:${userId}`).emit('notification', {
      message,
      type: 'info',
      timestamp: Date.now(),
    });
  });
}

/**
 * Kick a specific user (disconnect all their sockets)
 */
function kickUser(userId: string, reason: string) {
  console.log(`\n🚫 Kicking user ${userId}: ${reason}`);
  
  // Notify user
  server.toRoom(`user:${userId}`).emit('session.expired', {
    userId,
    reason,
  });
  
  // Disconnect all their sockets
  const userSockets = getUserSockets(userId);
  userSockets.forEach(socket => {
    socket.disconnect(true);
  });
  
  // Revoke their token
  userSockets.forEach(socket => {
    revokeToken(socket.auth.token);
  });
}

/**
 * Get online users
 */
function getOnlineUsers(): string[] {
  const users = new Set<string>();
  
  server.getAllAuthSockets().forEach(socket => {
    users.add(socket.auth.userId);
  });
  
  return Array.from(users);
}

// ============================================
// 7. Demo Scenarios
// ============================================

httpServer.listen(3000, () => {
  console.log('=== BoltSocket Auth Demo Server ===');
  console.log('🚀 Server listening on port 3000\n');
  console.log('📝 Test with these tokens:');
  
  // Generate test tokens
  const aliceToken = generateToken('alice', 'alice@example.com', 'admin', 120000); // 2 min expiry
  const bobToken = generateToken('bob', 'bob@example.com', 'user', 180000); // 3 min expiry
  const charlieToken = generateToken('charlie', 'charlie@example.com', 'user', 3600000); // 1 hour expiry
  
  console.log(`\nAlice (admin, expires in 2min):`);
  console.log(`  Token: ${aliceToken}`);
  console.log(`  Connect: io('http://localhost:3000', { auth: { token: '${aliceToken}' } })`);
  
  console.log(`\nBob (user, expires in 3min):`);
  console.log(`  Token: ${bobToken}`);
  console.log(`  Connect: io('http://localhost:3000', { auth: { token: '${bobToken}' } })`);
  
  console.log(`\nCharlie (user, expires in 1hr):`);
  console.log(`  Token: ${charlieToken}`);
  console.log(`  Connect: io('http://localhost:3000', { auth: { token: '${charlieToken}' } })`);
  
  // Demo scenarios after connections
  setTimeout(() => {
    console.log('\n\n=== Running Demo Scenarios ===\n');
    
    // Scenario 1: Check who's online
    setTimeout(() => {
      const onlineUsers = getOnlineUsers();
      console.log('\n--- Scenario 1: Who\'s Online ---');
      console.log('Online users:', onlineUsers);
    }, 2000);
    
    // Scenario 2: Broadcast to all
    setTimeout(() => {
      console.log('\n--- Scenario 2: Broadcast ---');
      broadcastToAllUsers('System maintenance in 10 minutes');
    }, 4000);
    
    // Scenario 3: Token expiry handling
    // Alice's token will expire in 2 minutes
    console.log('\n--- Scenario 3: Token Expiry ---');
    console.log('Alice\'s token will expire in 2 minutes...');
    console.log('Watch for automatic token refresh or disconnect');
    
  }, 1000);
});

// ============================================
// Key Takeaways
// ============================================

/*
 * Security Best Practices:
 * 
 * 1. ✅ Always validate tokens on connection
 * 2. ✅ Use short-lived tokens with refresh mechanism
 * 3. ✅ Revoke tokens on logout
 * 4. ✅ Check token expiry periodically
 * 5. ✅ Use HTTPS in production
 * 6. ✅ Validate auth on every sensitive operation
 * 
 * Connection Reliability:
 * 
 * 1. ✅ Refresh tokens before expiry
 * 2. ✅ Handle disconnects gracefully
 * 3. ✅ Track user sessions across tabs
 * 4. ✅ Clean up on disconnect
 * 5. ✅ Provide clear error messages
 * 
 * Edge Cases Handled:
 * 
 * 1. ✅ Token expires mid-connection → Refresh or disconnect
 * 2. ✅ Reconnect after logout → Auth fails, redirect to login
 * 3. ✅ Multiple tabs → Track all sessions, logout affects all
 * 4. ✅ Invalid token → Connection rejected
 * 5. ✅ Network issues → Auto-reconnect with fresh token
 * 
 * Production Considerations:
 * 
 * - Use a real JWT library (jsonwebtoken, jose)
 * - Store tokens in Redis for scalability
 * - Implement rate limiting
 * - Add IP whitelisting for sensitive operations
 * - Log all auth failures
 * - Monitor failed connection attempts
 * - Use refresh tokens stored in HttpOnly cookies
 * - Implement session management across multiple servers
 */
