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

/**
 * Safe metadata type that restricts allowed keys to prevent PII leakage.
 * Only whitelisted keys with controlled value types are permitted.
 */
export type SafeMetadata = {
  projectId?: number;
  projectSlug?: string;
  category?: string;
  term?: string;
  source?: string;
  flowName?: string;
  actionName?: string;
  featureName?: string;
};

/**
 * Sanitized context type for action events.
 * Only allows whitelisted keys to prevent arbitrary PII.
 */
export type SanitizedContext = {
  source?: 'header' | 'empty_state' | 'sidebar' | 'dashboard';
  category?: string;
  resultCount?: number;
};

/**
 * Sanitized interaction data for feature interactions.
 * Only allows whitelisted keys to prevent arbitrary PII.
 */
export type SanitizedInteractionData = {
  projectId?: number;
  projectSlug?: string;
  category?: string;
  term?: string;
  resultCount?: number;
};

/**
 * Sanitized error type for failure events.
 * Only allows whitelisted error types, no free-form error messages.
 */
export type SanitizedErrorType =
  | 'network_error'
  | 'validation_error'
  | 'auth_error'
  | 'timeout_error'
  | 'unknown_error';

export type BaseEventPayload = {
  // Common properties
  timestamp?: string; // Automatically added by the adapter
  path?: string;
  userAgent?: string;
  category?: EventCategory;
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
  context?: SanitizedContext;
};

// Completions
export type CompletionPayload = BaseEventPayload & {
  flowName: 'operator_login' | 'queue_command';
  durationMs?: number;
};

// Failures/Retries
export type FailurePayload = BaseEventPayload & {
  flowName: 'operator_login' | 'queue_command';
  errorType: SanitizedErrorType;
};

// Feature Interactions
export type FeatureInteractionPayload = BaseEventPayload & {
  featureName: 'project_search' | 'category_filter' | 'view_project';
  interactionData?: SanitizedInteractionData;
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