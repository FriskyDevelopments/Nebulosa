import { EventName, EventMap } from './events';
import { AnalyticsAdapter, defaultAdapter } from './adapter';

class AnalyticsTracker {
  private adapter: AnalyticsAdapter;

  constructor(adapter: AnalyticsAdapter) {
    this.adapter = adapter;
  }

  /**
   * Tracks an analytics event securely.
   * Ensures that payload data does not contain PII by enforcing the typed EventMap.
   *
   * @param eventName The name of the event to track
   * @param payload The typed payload for the event
   */
  public track<K extends EventName>(eventName: K, payload: EventMap[K]) {
    // Inject common safe properties if not provided
    const enrichedPayload = {
      ...payload,
      path: payload.path || (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Fire and forget
    this.adapter.track(eventName, enrichedPayload);
  }

  /**
   * Identifies a user for session-based tracking.
   *
   * @param userId A unique anonymous or hashed user identifier
   * @param traits Non-PII user traits
   */
  public identify(userId: string, traits?: Record<string, any>) {
    this.adapter.identify(userId, traits);
  }

  /**
   * Replaces the current adapter with a new one (e.g., when initializing a 3rd party like Mixpanel)
   */
  public setAdapter(adapter: AnalyticsAdapter) {
    this.adapter = adapter;
  }
}

// Export a singleton instance
export const analytics = new AnalyticsTracker(defaultAdapter);
export * from './events';
export * from './adapter';
