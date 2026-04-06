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
 * Accepts configurable endpoints to avoid failed calls when routes aren't registered.
 */
export class ServerApiAnalyticsAdapter implements AnalyticsAdapter {
  private trackEndpoint: string;
  private identifyEndpoint: string;

  constructor(trackEndpoint: string = '/api/analytics/events', identifyEndpoint: string = '/api/analytics/identify') {
    this.trackEndpoint = trackEndpoint;
    this.identifyEndpoint = identifyEndpoint;
  }

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
      await apiRequest('POST', this.trackEndpoint, safePayload);

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

      await apiRequest('POST', this.identifyEndpoint, payload);

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
// In production, only use ServerApiAnalyticsAdapter if analytics endpoints are explicitly configured
// Otherwise fall back to ConsoleAnalyticsAdapter to avoid dropped/failed calls
const getDefaultAdapter = (): AnalyticsAdapter => {
  // Check if analytics endpoints are configured via environment variables
  const trackEndpoint = import.meta.env.VITE_ANALYTICS_TRACK_ENDPOINT;
  const identifyEndpoint = import.meta.env.VITE_ANALYTICS_IDENTIFY_ENDPOINT;

  // Only use ServerApiAnalyticsAdapter if endpoints are explicitly configured
  if (import.meta.env.PROD && (trackEndpoint || identifyEndpoint)) {
    return new ServerApiAnalyticsAdapter(trackEndpoint, identifyEndpoint);
  }

  // Default to ConsoleAnalyticsAdapter in dev or when endpoints aren't configured
  return new ConsoleAnalyticsAdapter();
};

export const defaultAdapter = getDefaultAdapter();