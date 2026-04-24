import type { ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import type { EventSchema, EventRegistry, EventNames, EventPayload, ReconnectOptions } from '@bolt-socket/core';
import type { ManagerOptions, SocketOptions } from 'socket.io-client';

export type { ReconnectOptions };

/**
 * Socket.IO client options type
 */
export type SocketIOClientOptions = Partial<ManagerOptions & SocketOptions>;

/**
 * Auth data provider - can be static object or async function
 * 
 * @example Static auth
 * ```ts
 * auth={{ token: 'abc123' }}
 * ```
 * 
 * @example Async auth provider
 * ```ts
 * auth={async () => {
 *   const token = await getAuthToken();
 *   return { token };
 * }}
 * ```
 */
export type AuthProvider = object | (() => object | Promise<object>);

/**
 * Authentication error details
 */
export interface AuthError {
  /**
   * Error message from server
   */
  message: string;
  
  /**
   * Original error object
   */
  error?: Error;
}

/**
 * Socket connection callbacks
 */
export interface SocketCallbacks {
  /**
   * Called when connection is successfully established
   * 
   * @example
   * ```tsx
   * onConnect={() => {
   *   console.log('Connected to server');
   *   toast.success('Connected!');
   * }}
   * ```
   */
  onConnect?: () => void;

  /**
   * Called when connection is lost
   * 
   * @param reason - Disconnect reason from Socket.IO
   * 
   * @example
   * ```tsx
   * onDisconnect={(reason) => {
   *   console.log('Disconnected:', reason);
   *   if (reason === 'io server disconnect') {
   *     toast.error('Server kicked you out');
   *   }
   * }}
   * ```
   */
  onDisconnect?: (reason: string) => void;

  /**
   * Called when authentication fails
   * Use this to redirect to login, show error message, etc.
   * 
   * @param error - Auth error details
   * 
   * @example
   * ```tsx
   * onAuthError={(error) => {
   *   console.error('Auth failed:', error.message);
   *   localStorage.removeItem('token');
   *   navigate('/login');
   * }}
   * ```
   */
  onAuthError?: (error: AuthError) => void;

  /**
   * Called when any connection error occurs
   * 
   * @param error - Error object
   * 
   * @example
   * ```tsx
   * onError={(error) => {
   *   console.error('Connection error:', error.message);
   *   toast.error('Connection failed');
   * }}
   * ```
   */
  onError?: (error: Error) => void;

  /**
   * Called when socket attempts to reconnect
   * 
   * @param attemptNumber - Current reconnection attempt number
   * 
   * @example
   * ```tsx
   * onReconnectAttempt={(attempt) => {
   *   console.log(`Reconnecting... attempt ${attempt}`);
   * }}
   * ```
   */
  onReconnectAttempt?: (attemptNumber: number) => void;
}

/**
 * Socket provider props
 * 
 * @template T - Event schema type
 * 
 * @example Basic usage
 * ```tsx
 * <SocketProvider
 *   url="http://localhost:3000"
 *   events={events}
 *   auth={{ token: 'abc' }}
 * >
 *   <App />
 * </SocketProvider>
 * ```
 * 
 * @example With callbacks
 * ```tsx
 * <SocketProvider
 *   url="http://localhost:3000"
 *   events={events}
 *   auth={async () => ({ token: await getToken() })}
 *   onConnect={() => console.log('Connected!')}
 *   onAuthError={(error) => navigate('/login')}
 * >
 *   <App />
 * </SocketProvider>
 * ```
 */
export interface SocketProviderProps<T extends EventSchema> {
  /**
   * Socket.IO server URL
   * 
   * @example 'http://localhost:3000'
   * @example 'https://api.example.com'
   */
  url: string;

  /**
   * Event registry for type-safe events
   * Must be the same registry used on the server
   */
  events: EventRegistry<T>;

  /**
   * Optional authentication data or provider function
   * Can be a static object or async function that returns auth data
   * On reconnect, function will be called again to refresh auth data
   * 
   * @example Static: `{ token: 'abc123' }`
   * @example Async: `async () => ({ token: await getToken() })`
   */
  auth?: AuthProvider;

  /**
   * Additional Socket.IO client options
   * 
   * @see https://socket.io/docs/v4/client-options/
   */
  options?: SocketIOClientOptions;

  /**
   * Called when connection is successfully established
   */
  onConnect?: () => void;

  /**
   * Called when connection is lost
   */
  onDisconnect?: (reason: string) => void;

  /**
   * Called when authentication fails
   * Use this to redirect to login or clear invalid tokens
   */
  onAuthError?: (error: AuthError) => void;

  /**
   * Called when any connection error occurs
   */
  onError?: (error: Error) => void;

  /**
   * Called when socket attempts to reconnect
   */
  onReconnectAttempt?: (attemptNumber: number) => void;

  /**
   * Called after the socket successfully reconnects.
   * Use this to re-fetch critical data or show "back online" UI.
   *
   * @param attempt - The attempt number that succeeded
   *
   * @example
   * ```tsx
   * onReconnect={(attempt) => {
   *   console.log(`Reconnected after ${attempt} attempts`);
   *   refetchCriticalData();
   *   toast.success('Connection restored!');
   * }}
   * ```
   */
  onReconnect?: (attempt: number) => void;

  /**
   * Fine-grained reconnection strategy.
   * When omitted, Socket.IO defaults are used (1s base delay, up to 5s, Infinity attempts).
   *
   * @example
   * ```tsx
   * reconnect={{
   *   maxAttempts: 10,
   *   delay: 500,
   *   maxDelay: 15000,
   *   randomization: 0.3
   * }}
   * ```
   */
  reconnect?: ReconnectOptions;

  /**
   * Automatically request missed events from the server after reconnecting.
   * Requires the server to have `reliability.replay.enabled = true`.
   *
   * When `true`, the provider sends `bolt:sync` with the last connection
   * timestamp immediately after reconnect, triggering event replay.
   *
   * @default false
   *
   * @example
   * ```tsx
   * <SocketProvider syncOnReconnect events={events} url={url}>
   *   {/* Use useEventReplay() inside to consume replayed events *\/}
   * </SocketProvider>
   * ```
   */
  syncOnReconnect?: boolean;

  /**
   * Child components that can use socket hooks
   */
  children: ReactNode;
}

/**
 * Socket context value (internal)
 * 
 * @template T - Event schema type
 */
export interface SocketContextValue<T extends EventSchema> {
  /**
   * The socket instance (null if not connected)
   */
  socket: Socket | null;

  /**
   * Event registry
   */
  events: EventRegistry<T>;

  /**
   * Whether the socket is connected
   */
  isConnected: boolean;
}

/**
 * Event handler function type
 * 
 * Strongly typed callback that receives validated event payload
 * 
 * @template T - Event schema type
 * @template E - Specific event name
 * 
 * @example
 * ```ts
 * const handler: EventHandler<typeof schema, 'order.updated'> = (data) => {
 *   // data is typed as { orderId: string; status: string }
 *   console.log(data.orderId);
 * };
 * ```
 */
export type EventHandler<T extends EventSchema, E extends EventNames<T>> = (
  payload: EventPayload<T, E>
) => void;
