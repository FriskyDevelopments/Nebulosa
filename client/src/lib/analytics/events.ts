/**
 * Analytics Event Taxonomy
 *
 * Critical events that matter most for product understanding:
 * 1. Landing Engagement: User lands on a page, views hero content.
 * 2. Flow Starts: User begins a critical journey (e.g., login, create project).
 * 3. Action Submits: User performs an action (e.g., form submit, click button).
 * 4. Completions: User successfully completes a flow.
 * 5. Failures/Retries: User encounters an error or retries an action.
 * 6. Feature Interactions: User interacts with a feature (e.g., search, filter).
 */

export type EventCategory =
  | 'landing'
  | 'auth'
  | 'project_hub'
  | 'operator_control'
  | 'system';

export type BaseEventPayload = {
  // Common properties
  timestamp?: string; // Automatically added by the adapter
  path?: string;
  userAgent?: string;
  category?: EventCategory;
};

/**
 * Safe metadata type that restricts values to prevent arbitrary PII.
 * Only allows specific vetted keys with constrained value types.
 */
export type SafeMetadata = {
  // Project-related safe identifiers
  projectId?: number;
  projectSlug?: string;

  // Search and filter parameters
  term?: string; // Search terms (should be sanitized by caller)
  category?: string;

  // UI interaction context
  source?: string; // e.g., 'header', 'empty_state', 'sidebar'
  action?: string;

  // Numeric metrics only
  count?: number;
  index?: number;
  duration?: number;
};

// Landing Engagement
export type LandingEngagementPayload = BaseEventPayload & {
  page: 'home' | 'spark' | 'nebulosa_dashboard';
  referrer?: string;
};

// Flow Starts
export type FlowStartPayload = BaseEventPayload & {
  flowName: 'operator_login' | 'create_project' | 'navigate_to_spark';
  source?: string;
};

// Action Submits
export type ActionSubmitPayload = BaseEventPayload & {
  actionName: 'spark_navigation_click' | 'operator_login_attempt' | 'queue_command';
  context?: SafeMetadata;
};

// Completions
export type CompletionPayload = BaseEventPayload & {
  flowName: 'operator_login' | 'queue_command';
  durationMs?: number;
};

// Failures/Retries
// Constrain error types to known categories to prevent logging arbitrary error messages with PII
export type KnownErrorType =
  | 'network_error'
  | 'validation_error'
  | 'auth_error'
  | 'timeout_error'
  | 'server_error'
  | 'unknown_error';

export type FailurePayload = BaseEventPayload & {
  flowName: 'operator_login' | 'queue_command';
  errorType: KnownErrorType;
  // Remove errorMessage field to prevent arbitrary PII logging
  // If error details are needed, use errorType categorization instead
};

// Feature Interactions
export type FeatureInteractionPayload = BaseEventPayload & {
  featureName: 'project_search' | 'category_filter' | 'view_project';
  interactionData?: SafeMetadata;
};

// Event Map binding event names to their payloads
export interface EventMap {
  'landing_engagement': LandingEngagementPayload;
  'flow_start': FlowStartPayload;
  'action_submit': ActionSubmitPayload;
  'flow_completion': CompletionPayload;
  'flow_failure': FailurePayload;
  'feature_interaction': FeatureInteractionPayload;
}

export type EventName = keyof EventMap;