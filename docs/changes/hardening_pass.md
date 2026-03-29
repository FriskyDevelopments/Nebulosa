# Hardening Pass Changelog

## What was wrong

1. Config contract drift:
   - DB/Redis had localhost fallbacks that masked missing production configuration.
   - Validation was minimal and only partially enforced.

2. Readiness semantics were incorrect:
   - `/health/ready` always returned ready, independent of dependency status.

3. Worker lifecycle risk:
   - No coordinated async shutdown path for queues and DB client.
   - Potential temp-file leaks in media processing path.

4. Observability gaps:
   - No request correlation ID normalization.
   - Logging redaction was not centrally enforced.
   - HTTP request logs were not fully structured around request context.

5. Test/runtime mismatch:
   - Tests did not reflect new readiness behavior or explicit API-mode config contract.

## What was fixed

1. Rebuilt startup settings contract:
   - Added `Settings` class + `validate()` with explicit mode-based requirements.
   - Removed DB/Redis localhost defaults.
   - Added strict numeric bounds checks.

2. Introduced dependency manager:
   - Added `createDependencies()`, refresh probes, readiness state tracking.
   - Dependency outages now produce degraded runtime state instead of startup crash.

3. Correct readiness behavior:
   - `/health/ready` now returns `503` with `not_ready` and detailed dependency state.

4. Hardened worker lifecycle:
   - Added graceful signal handling, queue close await, Prisma disconnect.
   - Added media temp-file cleanup in `finally`.

5. Logging hardening:
   - Added central redaction/sanitization.
   - Added correlation ID middleware and structured HTTP request completion logs.

6. Test alignment:
   - Updated API integration tests for readiness `200` vs `503` behavior.
   - Added configuration contract tests for mode-based validation.

## Why it matters

- Prevents silent startup with unsafe defaults.
- Separates configuration correctness from runtime dependency availability.
- Improves operational safety during outages and shutdown.
- Enables traceability and safer logs in production incidents.
- Keeps tests aligned with actual runtime contracts.

## Follow-up tasks

1. Add periodic background dependency refresh metrics and expose to Prometheus.
2. Add retry/backoff instrumentation for dependency probes with circuit-breaker semantics.
3. Expand redaction rules with allowlist-based structured field policy.
4. Add end-to-end tests with containerized Postgres/Redis for readiness transitions.
5. Add explicit bot-mode runtime entrypoint wiring and mode-specific process scripts.
