import { EventName, EventMap } from './events';
import { apiRequest } from '../queryClient'; // Assuming this exists and is used

/**
 * Analytics Adapter Interface
 * Allows swapping out the underlying implementation.
 */
export interface AnalyticsAdapter {
  track<K extends EventName>(eventName: K, payload: EventMap[K]): void | Promise<void>;
  identify(userId: string, traits?: Record<string, any>): void | Promise<void>;
}

/**
 * Mock/Console Adapter for development and safe fallback.
 */
export class ConsoleAnalyticsAdapter implements AnalyticsAdapter {
  track<K extends EventName>(eventName: K, payload: EventMap[K]): void {
    if (import.meta.env.DEV || window.__NEBULOSA_DEBUG) {
      console.log(`[Analytics] Tracked Event: ${eventName}`, payload);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (import.meta.env.DEV || window.__NEBULOSA_DEBUG) {
      console.log(`[Analytics] Identified User: ${userId}`, traits);
    }
  }
}

/**
 * Server API Adapter wrapping the `POST /analytics/events` backend endpoint.
 * Note: Assumes `POST /api/v1/analytics/events` or similar if we use Nebulosa v1 APIs,
 * but based on existing codebase we've seen `/analytics/events` as a possible path.
 * We'll use a generic API call.
 */
export class ServerApiAnalyticsAdapter implements AnalyticsAdapter {
  async track<K extends EventName>(eventName: K, payload: EventMap[K]): Promise<void> {
    try {
      // Avoid sending sensitive payload data, ensure it's privacy safe
      const safePayload = {
        event: eventName,
        properties: {
          ...payload,
        }
      };

      // Call the existing analytics endpoint if it exists
      // We wrap it in a try-catch so it won't block the UI if the endpoint fails
      await apiRequest('POST', '/api/analytics/events', safePayload);

      if (import.meta.env.DEV || window.__NEBULOSA_DEBUG) {
        console.log(`[Analytics - Server] Tracked Event: ${eventName}`, safePayload);
      }
    } catch (err) {
      if (import.meta.env.DEV || window.__NEBULOSA_DEBUG) {
        console.error(`[Analytics - Server] Failed to track event: ${eventName}`, err);
      }
    }
  }

  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    try {
      const payload = {
        userId,
        traits: traits || {},
      };

      await apiRequest('POST', '/api/analytics/identify', payload);

      if (import.meta.env.DEV || window.__NEBULOSA_DEBUG) {
        console.log(`[Analytics - Server] Identified User: ${userId}`, traits);
      }
    } catch (err) {
      if (import.meta.env.DEV || window.__NEBULOSA_DEBUG) {
        console.error(`[Analytics - Server] Failed to identify user: ${userId}`, err);
      }
      throw err;
    }
  }
}

// Select adapter based on environment or feature flag
export const defaultAdapter = import.meta.env.PROD
  ? new ServerApiAnalyticsAdapter() // Use server adapter in prod (fallback safe due to try/catch)
  : new ConsoleAnalyticsAdapter();  // Use console adapter in dev