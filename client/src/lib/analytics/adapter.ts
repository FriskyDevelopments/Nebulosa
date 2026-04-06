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
    if (import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__NEBULOSA_DEBUG === true)) {
      console.log(`[Analytics] Tracked Event: ${eventName}`, payload);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__NEBULOSA_DEBUG === true)) {
      console.log(`[Analytics] Identified User: ${userId}`, traits);
    }
  }
}

/**
 * Server API Adapter. Only used when VITE_ANALYTICS_ENDPOINT is explicitly configured.
 * Posts events to the configured endpoint.
 */
export class ServerApiAnalyticsAdapter implements AnalyticsAdapter {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async track<K extends EventName>(eventName: K, payload: EventMap[K]): Promise<void> {
    try {
      const safePayload = {
        event: eventName,
        properties: {
          ...payload,
          timestamp: payload.timestamp ?? new Date().toISOString(),
          path: payload.path ?? window.location.pathname,
        }
      };

      await apiRequest('POST', this.endpoint, safePayload);

      if (import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__NEBULOSA_DEBUG === true)) {
        console.log(`[Analytics - Server] Tracked Event: ${eventName}`, safePayload);
      }
    } catch (err) {
      if (import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__NEBULOSA_DEBUG === true)) {
        console.error(`[Analytics - Server] Failed to track event: ${eventName}`, err);
      }
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__NEBULOSA_DEBUG === true)) {
      console.log(`[Analytics - Server] Identity not yet implemented for server adapter: ${userId}`);
    }
  }
}

/**
 * Select adapter based on explicit configuration.
 * Defaults to ConsoleAnalyticsAdapter unless VITE_ANALYTICS_ENDPOINT is set,
 * which prevents 404 errors when no backend analytics route exists.
 */
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
export const defaultAdapter: AnalyticsAdapter = analyticsEndpoint
  ? new ServerApiAnalyticsAdapter(analyticsEndpoint)
  : new ConsoleAnalyticsAdapter();
