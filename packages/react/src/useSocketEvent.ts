import { useEffect, useRef, useCallback } from 'react';
import type { EventSchema, EventNames } from '@bolt-socket/core';
import type { EventHandler } from './types';
import { useSocketContext } from './SocketProvider';

/**
 * useSocketEvent - Subscribe to a socket event with automatic cleanup
 * 
 * This hook handles the complex lifecycle of socket event listeners:
 * - Subscribes to event when component mounts
 * - Cleans up listener when component unmounts
 * - Reattaches listener after reconnection
 * - Prevents stale closures by keeping handler fresh
 * - Avoids duplicate listeners
 * - Supports dependency array for handler updates
 * 
 * @param eventName - Type-safe event name from registry
 * @param handler - Callback function with typed payload
 * @param deps - Optional dependency array (like useEffect)
 * 
 * @example
 * ```tsx
 * useSocketEvent('order.updated', (data) => {
 *   console.log('Order', data.orderId, 'is now', data.status);
 * });
 * ```
 * 
 * @example With dependencies
 * ```tsx
 * const [orderId, setOrderId] = useState('123');
 * 
 * useSocketEvent('order.updated', (data) => {
 *   if (data.orderId === orderId) {
 *     console.log('My order updated!');
 *   }
 * }, [orderId]); // Resubscribe when orderId changes
 * ```
 */
export function useSocketEvent<T extends EventSchema, E extends EventNames<T>>(
  eventName: E,
  handler: EventHandler<T, E>,
  deps: React.DependencyList = []
): void {
  const { socket, events } = useSocketContext<T>();
  
  // Store the latest handler in a ref to avoid stale closures
  // This ensures the handler always has access to the latest props/state
  const handlerRef = useRef<EventHandler<T, E>>(handler);
  
  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Create a stable wrapper function that calls the latest handler
  // This wrapper is what gets registered with socket.io
  const stableHandler = useCallback((payload: any) => {
    // Validate the payload before calling handler
    const result = events.validate(eventName, payload);
    
    if (result.success) {
      // Call the latest handler with validated data
      handlerRef.current(result.data);
    } else {
      // Log validation errors but don't throw
      console.error(
        `[BoltSocket] Received invalid payload for event "${String(eventName)}":`,
        result.error.issues
      );
    }
  }, [eventName, events]);

  useEffect(() => {
    // Can't subscribe without socket
    if (!socket) {
      return;
    }

    // Check if event exists in registry
    if (!events.hasEvent(eventName)) {
      console.error(
        `[BoltSocket] Event "${String(eventName)}" not found in registry`
      );
      return;
    }

    // Subscribe to the event
    console.log(`[BoltSocket] Subscribing to event: ${String(eventName)}`);
    socket.on(String(eventName), stableHandler as any);

    // Cleanup function - remove listener on unmount or deps change
    return () => {
      console.log(`[BoltSocket] Unsubscribing from event: ${String(eventName)}`);
      socket.off(String(eventName), stableHandler as any);
    };
  }, [socket, eventName, stableHandler, events, ...deps]);

  // Handle reconnection - reattach listeners
  useEffect(() => {
    if (!socket) return;

    const handleReconnect = () => {
      console.log(`[BoltSocket] Reconnected - reattaching listener for: ${String(eventName)}`);
      // Listener is already attached via the main useEffect above
      // This just logs for debugging
    };

    socket.on('connect', handleReconnect);

    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, eventName]);
}

/**
 * useSocketEventOnce - Subscribe to an event that fires only once
 * 
 * Automatically removes listener after first invocation.
 * 
 * @param eventName - Type-safe event name from registry
 * @param handler - Callback function with typed payload
 * 
 * @example
 * ```tsx
 * useSocketEventOnce('connection.established', (data) => {
 *   console.log('Connected with session:', data.sessionId);
 * });
 * ```
 */
export function useSocketEventOnce<T extends EventSchema, E extends EventNames<T>>(
  eventName: E,
  handler: EventHandler<T, E>
): void {
  const { socket, events } = useSocketContext<T>();
  const handlerRef = useRef<EventHandler<T, E>>(handler);
  const firedRef = useRef(false);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || firedRef.current) {
      return;
    }

    if (!events.hasEvent(eventName)) {
      console.error(
        `[BoltSocket] Event "${String(eventName)}" not found in registry`
      );
      return;
    }

    const onceHandler = (payload: any) => {
      const result = events.validate(eventName, payload);
      
      if (result.success) {
        handlerRef.current(result.data);
        firedRef.current = true;
      } else {
        console.error(
          `[BoltSocket] Received invalid payload for event "${String(eventName)}":`,
          result.error.issues
        );
      }
    };

    console.log(`[BoltSocket] Subscribing once to event: ${String(eventName)}`);
    socket.once(String(eventName), onceHandler as any);

    return () => {
      socket.off(String(eventName), onceHandler as any);
    };
  }, [socket, eventName, events]);
}
