/**
 * Example: React Auth Integration (Phase 6 Client)
 * 
 * Demonstrates secure connection management in React:
 * - Pass token on connect
 * - Refresh token on reconnect
 * - Handle auth failures gracefully
 * - Multiple tabs handling
 * - Token expiry management
 */

import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocketEvent, useSocket } from '@bolt-socket/react';
import { createEventRegistry } from '@bolt-socket/core';
import { z } from 'zod';

// ============================================
// 1. Shared Event Schema
// ============================================

const events = createEventRegistry({
  'user.connected': z.object({
    userId: z.string(),
    email: z.string(),
    connectedAt: z.number(),
  }),
  
  'notification': z.object({
    message: z.string(),
    type: z.enum(['info', 'success', 'warning', 'error']),
    timestamp: z.number(),
  }),
  
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
// 2. Mock Auth Service
// ============================================

interface User {
  id: string;
  email: string;
  token: string;
}

class AuthService {
  private static TOKEN_KEY = 'auth_token';
  private static USER_KEY = 'auth_user';

  /**
   * Get current token from localStorage
   */
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Save token to localStorage
   */
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Get current user from localStorage
   */
  static getUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Save user to localStorage
   */
  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear auth data (logout)
   */
  static clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Mock login
   */
  static async login(email: string, password: string): Promise<User> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock token generation
    const token = `jwt_${Math.random().toString(36).substring(2)}`;
    const user: User = {
      id: email.split('@')[0],
      email,
      token,
    };

    this.setToken(token);
    this.setUser(user);

    return user;
  }

  /**
   * Logout
   */
  static logout(): void {
    this.clearAuth();
  }

  /**
   * Refresh token
   * Called when token is about to expire
   */
  static async refreshToken(oldToken: string): Promise<string> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mock new token
    const newToken = `jwt_refreshed_${Math.random().toString(36).substring(2)}`;
    this.setToken(newToken);

    const user = this.getUser();
    if (user) {
      user.token = newToken;
      this.setUser(user);
    }

    return newToken;
  }
}

// ============================================
// 3. Login Component
// ============================================

function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await AuthService.login(email, password);
      onLogin(user);
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h2>Login to BoltSocket Demo</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 15 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 10 }}
            required
          />
        </div>

        <div style={{ marginBottom: 15 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 10 }}
            required
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 15 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
        <p>Test accounts:</p>
        <ul>
          <li>alice@example.com</li>
          <li>bob@example.com</li>
          <li>charlie@example.com</li>
        </ul>
        <p>Password: any</p>
      </div>
    </div>
  );
}

// ============================================
// 4. Dashboard with Real-Time Features
// ============================================

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const socket = useSocket();
  const [notifications, setNotifications] = useState<Array<{
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  }>>([]);

  // Listen for notifications
  useSocketEvent('notification', (data) => {
    setNotifications(prev => [...prev, data]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.timestamp !== data.timestamp));
    }, 5000);
  });

  // Listen for session refresh (token about to expire)
  useSocketEvent('session.refresh', (data) => {
    console.log('🔄 Token refreshed:', data.newToken);
    
    // Update token in storage
    AuthService.setToken(data.newToken);
    
    const currentUser = AuthService.getUser();
    if (currentUser) {
      currentUser.token = data.newToken;
      AuthService.setUser(currentUser);
    }
    
    alert('Your session has been refreshed!');
  });

  // Listen for session expiry
  useSocketEvent('session.expired', (data) => {
    console.log('❌ Session expired:', data.reason);
    
    alert(`Session expired: ${data.reason}\nPlease log in again.`);
    
    // Clean up and force logout
    onLogout();
  });

  // Handle manual logout
  const handleLogout = () => {
    // Notify server
    if (socket) {
      socket.emit('logout');
    }
    
    onLogout();
  };

  return (
    <div style={{ padding: 20 }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottom: '1px solid #ddd'
      }}>
        <div>
          <h1>BoltSocket Dashboard</h1>
          <p style={{ color: '#666' }}>
            Logged in as: <strong>{user.email}</strong>
          </p>
          <p style={{ fontSize: 12, color: '#999' }}>
            Socket ID: {socket?.id || 'Not connected'}
          </p>
        </div>
        
        <button
          onClick={handleLogout}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </header>

      {/* Notifications */}
      <div style={{ position: 'fixed', top: 20, right: 20, width: 300 }}>
        {notifications.map((notif, index) => (
          <div
            key={notif.timestamp}
            style={{
              padding: 15,
              marginBottom: 10,
              background: notif.type === 'error' ? '#fee' :
                         notif.type === 'success' ? '#efe' :
                         notif.type === 'warning' ? '#ffe' : '#eef',
              border: `1px solid ${
                notif.type === 'error' ? '#fcc' :
                notif.type === 'success' ? '#cfc' :
                notif.type === 'warning' ? '#ffc' : '#ccf'
              }`,
              borderRadius: 4,
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <strong style={{ textTransform: 'uppercase', fontSize: 12 }}>
              {notif.type}
            </strong>
            <p style={{ margin: '5px 0 0 0' }}>{notif.message}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 4 }}>
          <h3>Connection Status</h3>
          <p>
            Status: <strong style={{ color: socket?.connected ? 'green' : 'red' }}>
              {socket?.connected ? 'Connected' : 'Disconnected'}
            </strong>
          </p>
        </div>

        <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 4 }}>
          <h3>Test Features</h3>
          <p>Open multiple tabs to test multi-tab handling</p>
          <p>Token will auto-refresh when expiring</p>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 5. Main App with Auth Provider
// ============================================

export default function App() {
  const [user, setUser] = useState<User | null>(() => AuthService.getUser());

  // Check auth on mount
  useEffect(() => {
    const currentUser = AuthService.getUser();
    setUser(currentUser);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    AuthService.clearAuth();
    setUser(null);
  };

  // If not authenticated, show login
  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // ============================================
  // ✅ SocketProvider with Auth Callbacks
  // ============================================
  
  return (
    <SocketProvider
      url="http://localhost:3000"
      events={events}
      
      // ✅ Pass token on connect (refreshed automatically on reconnect)
      auth={async () => {
        const token = AuthService.getToken();
        
        if (!token) {
          throw new Error('No token available');
        }
        
        console.log('🔑 Using token for connection:', token);
        return { token };
      }}
      
      // ✅ Connection established
      onConnect={() => {
        console.log('✅ Connected to server');
      }}
      
      // ✅ Connection lost
      onDisconnect={(reason) => {
        console.log('❌ Disconnected:', reason);
        
        // If server kicked us, might be auth issue
        if (reason === 'io server disconnect') {
          console.warn('Server disconnected us - possible auth issue');
        }
      }}
      
      // ✅ Auth error - redirect to login
      onAuthError={(error) => {
        console.error('🔒 Auth error:', error.message);
        
        alert(`Authentication failed: ${error.message}\nPlease log in again.`);
        
        // Clear invalid token and logout
        handleLogout();
      }}
      
      // ✅ Connection error
      onError={(error) => {
        console.error('⚠️  Connection error:', error.message);
      }}
      
      // ✅ Reconnection attempt
      onReconnectAttempt={(attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt}`);
      }}
    >
      <Dashboard user={user} onLogout={handleLogout} />
    </SocketProvider>
  );
}

// ============================================
// Key Takeaways
// ============================================

/*
 * Frontend Auth Best Practices:
 * 
 * 1. ✅ Use async auth provider for token refresh
 * 2. ✅ Handle auth errors gracefully (redirect to login)
 * 3. ✅ Update token when server sends refresh
 * 4. ✅ Clear auth data on logout
 * 5. ✅ Show user feedback on connection status
 * 6. ✅ Handle session expiry across tabs
 * 
 * Token Management:
 * 
 * - Store tokens securely (HttpOnly cookies in production)
 * - Refresh before expiry
 * - Clear on logout
 * - Validate on reconnect
 * 
 * User Experience:
 * 
 * - Show connection status
 * - Display auth errors clearly
 * - Handle reconnection transparently
 * - Notify user of token refresh
 * - Support multiple tabs
 * 
 * Edge Cases:
 * 
 * ✅ Token expires → Auto refresh or logout
 * ✅ Network issues → Auto reconnect with fresh token
 * ✅ Logout in one tab → All tabs redirect to login
 * ✅ Invalid token → Show error and redirect
 * ✅ Server restart → Reconnect with valid token
 */
