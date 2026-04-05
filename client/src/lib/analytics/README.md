# Analytics Instrumentation Layer

This module provides a typed, strongly structured analytics instrumentation layer designed for understanding critical product events without spamming low-value events.

## Event Taxonomy

The analytics taxonomy is designed around core user journey milestones:

1. **Landing Engagement** (`landing_engagement`): Triggers when a user lands on a key page (e.g., home, spark, dashboard).
2. **Flow Starts** (`flow_start`): Triggers when a user begins a significant flow (e.g., login, create a project).
3. **Action Submits** (`action_submit`): Triggers when a user intentionally submits an action (e.g., button click, form submit).
4. **Completions** (`flow_completion`): Triggers when a user successfully completes a flow.
5. **Failures/Retries** (`flow_failure`): Triggers when a flow fails due to an error.
6. **Feature Interactions** (`feature_interaction`): Triggers when a user engages with specific features (e.g., search, filtering).

## Privacy-Safe Payload Design

- **No PII (Personally Identifiable Information)**: Payloads are explicitly typed to prevent the accidental inclusion of sensitive data (like passwords, tokens, or raw user input).
- **Enforced Shapes**: The `EventMap` in `events.ts` strictly bounds the expected properties for each event name.
- **Auto-injected Context**: The abstraction layer automatically injects non-sensitive context like `path` and `timestamp`.

## Adding New Events

1. Open `client/src/lib/analytics/events.ts`.
2. Define a new strongly-typed payload interface that extends `BaseEventPayload`.
3. Add the new event name and its payload interface to the `EventMap`.
4. The TypeScript compiler will now enforce this schema wherever you call `analytics.track('new_event', { ... })`.

## Adapter

The abstraction uses an adapter pattern.
- In development (`DEV`), it uses a `ConsoleAnalyticsAdapter` to log events safely to the console.
- In production (`PROD`), it uses a `ServerApiAnalyticsAdapter` to send events to the backend (`POST /api/analytics/events`).
- This makes it safe, production-ready, and easy to swap with a tool like Mixpanel, Amplitude, or PostHog in the future.
