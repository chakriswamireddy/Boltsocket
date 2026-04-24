import { useEffect, useRef, useCallback } from 'react';
import { logger, tracer } from '../core';
import type { EventSchema, EventNames } from '../core';
import type { EventHandler } from './types';
import { useSocketContext } from './SocketProvider';

/**
 * useSocketEvent — Subscribe to a typed socket event with automatic cleanup.
 *
 * Handles the full lifecycle of a socket event listener:
 * - Subscribes on mount, unsubscribes on unmount         (no memory leaks)
 * - Validates every incoming payload against the schema  (runtime safety)
 * - Prevents stale closures via a ref-based handler      (always fresh)
 * - Avoids duplicate listeners                           (stable wrapper)
 * - Dev mode: logs subscriptions + validation failures   (Phase 8)
 * - Dev mode: records inbound traces via tracer          (Phase 8)
 *
 * @param eventName - Type-safe event name from the registry
 * @param handler   - Callback function with fully typed payload
 * @param deps      - Optional dependency array (like useEffect)
 *
 * @example Basic
 * ```tsx
 * useSocketEvent('order.updated', (data) => {
 *   // data is fully typed: { orderId: string; status: string }
 *   setOrder(data);
 * });
 * ```
 *
 * @example With dependency
 * ```tsx
 * useSocketEvent('order.updated', (data) => {
 *   if (data.orderId === currentOrderId) updateUI(data);
 * }, [currentOrderId]);
 * ```
 */
export function useSocketEvent<T extends EventSchema, E extends EventNames<T>>(
  eventName: E,
  handler: EventHandler<T, E>,
  deps: React.DependencyList = []
): void {
  const { socket, events } = useSocketContext<T>();

  // Store the latest handler to prevent stale closures
  const handlerRef = useRef<EventHandler<T, E>>(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Stable wrapper: registered once, always delegates to latest handler
  const stableHandler = useCallback(
    (payload: unknown) => {
      const start = performance.now();
      const result = events.validate(eventName, payload);

      if (result.success) {
        // Phase 8: Record successful inbound trace
        tracer.trace({
          eventName: String(eventName),
          direction: 'inbound',
          payload: result.data,
          validated: true,
          durationMs: Math.round(performance.now() - start),
        });

        logger.debug('event', `Received "${String(eventName)}"`, {
          eventName,
          payload: result.data,
        });

        handlerRef.current(result.data);
      } else {
        // Phase 8: Record failed validation trace
        const errorMsg = result.error.issues
          .map(i => `${i.path.join('.')}: ${i.message}`)
          .join('; ');

        tracer.trace({
          eventName: String(eventName),
          direction: 'inbound',
          payload,
          validated: false,
          validationError: errorMsg,
        });

        logger.warn('validation', `Invalid payload for "${String(eventName)}"`, {
          eventName,
          issues: result.error.issues,
        });

        // Always warn about data contract violations — they indicate a schema mismatch
        console.warn(
          `[BoltSocket] ⚠️  Invalid payload for event "${String(eventName)}". ` +
          `Schema mismatch between server and client. Details: ${errorMsg}`
        );
      }
    },
    [eventName, events] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!socket) return;

    // Phase 8: Warning — event not in registry
    if (!events.hasEvent(eventName)) {
      logger.error('event', `Event "${String(eventName)}" not found in registry`, { eventName });
      console.error(
        `[BoltSocket] ❌ useSocketEvent called with unknown event "${String(eventName)}". ` +
        `Available events: ${events.getEventNames().join(', ')}`
      );
      return;
    }

    logger.debug('event', `Subscribing to "${String(eventName)}"`, { eventName });
    socket.on(String(eventName), stableHandler as any);

    return () => {
      logger.debug('event', `Unsubscribing from "${String(eventName)}"`, { eventName });
      socket.off(String(eventName), stableHandler as any);
    };
  }, [socket, eventName, stableHandler, events, ...deps]);
}

/**
 * useSocketEventOnce — Subscribe to an event that fires exactly once.
 *
 * Automatically removes the listener after the first valid invocation.
 * Validation is still applied — invalid payloads are rejected and the
 * listener remains until a valid payload arrives.
 *
 * @param eventName - Type-safe event name from the registry
 * @param handler   - Callback function with typed payload
 *
 * @example
 * ```tsx
 * useSocketEventOnce('connection.established', (data) => {
 *   console.log('Session ID:', data.sessionId);
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
    if (!socket || firedRef.current) return;

    if (!events.hasEvent(eventName)) {
      logger.error('event', `Event "${String(eventName)}" not found in registry`, { eventName });
      return;
    }

    const onceHandler = (payload: unknown) => {
      const result = events.validate(eventName, payload);

      if (result.success) {
        tracer.trace({
          eventName: String(eventName),
          direction: 'inbound',
          payload: result.data,
          validated: true,
        });

        logger.debug('event', `Once-event fired "${String(eventName)}"`, { eventName });
        handlerRef.current(result.data);
        firedRef.current = true;
      } else {
        const errorMsg = result.error.issues
          .map(i => `${i.path.join('.')}: ${i.message}`)
          .join('; ');

        tracer.trace({
          eventName: String(eventName),
          direction: 'inbound',
          payload,
          validated: false,
          validationError: errorMsg,
        });

        logger.warn('validation', `Invalid once-event payload for "${String(eventName)}"`, {
          eventName,
          issues: result.error.issues,
        });
      }
    };

    logger.debug('event', `Subscribing once to "${String(eventName)}"`, { eventName });
    socket.once(String(eventName), onceHandler as any);

    return () => {
      socket.off(String(eventName), onceHandler as any);
    };
  }, [socket, eventName, events]);
}
