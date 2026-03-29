# System Contracts: Configuration, Runtime, and Readiness

## 1) Configuration vs Runtime Responsibilities

### Startup (fail-fast) contracts
Configuration is validated at process bootstrap by `Settings.validate()`.

Fatal startup errors are limited to **configuration contract violations**:
- Invalid `NODE_ENV` / `APP_MODE`
- Invalid `PORT` bounds for API mode
- Missing required mode-specific secrets / URLs
- Invalid rate-limit / hashing numeric bounds

Mode requirements:
- `APP_MODE=api`: `DATABASE_URL` required
- `APP_MODE=worker`: `DATABASE_URL` and `REDIS_URL` required
- `APP_MODE=bot`: `TELEGRAM_BOT_TOKEN` required (and webhook URL in production)

This removes misleading localhost defaults for DB/Redis and prevents silent misconfiguration.

### Runtime (non-fatal) contracts
Dependency **availability** (database/redis reachability) is treated as runtime state:
- Startup attempts dependency probes but does not crash for temporary outages.
- Availability is reflected in readiness responses.

## 2) Readiness Model

`/health` is liveness-only and always reports process health.

`/health/ready` reflects dependency readiness:
- Returns `200` with `status=ready` when all dependencies required for the running mode are reachable.
- Returns `503` with `status=not_ready` when one or more required dependencies are unavailable.
- Includes structured dependency state (`configured`, `ready`, `error`, timestamps).

This enforces the contract:
- **Configuration errors fail startup**
- **Dependency outages fail readiness**

## 3) Worker Lifecycle Guarantees

Worker startup:
- Boots even during temporary dependency outages (degraded runtime model).
- Registers processors after dependency bootstrap attempt.

Worker shutdown:
- Handles `SIGTERM` / `SIGINT`.
- Closes all Bull queues via awaited shutdown flow.
- Disconnects Prisma client.
- Guards against duplicate shutdown calls.

Media processor cleanup:
- Uses `finally` cleanup for temporary input/output artifacts to avoid disk leaks.

## 4) Logging & Observability Model

### Structured logging
- JSON logging enforced in production by default.
- Development uses structured pretty output.
- All logs pass through redaction for sensitive keys (token/secret/password/apiKey/cookie/etc).
- URL credentials are sanitized.

### Correlation IDs
- Request middleware normalizes `x-correlation-id`.
- Invalid IDs are replaced with generated UUIDs.
- Correlation ID is returned in response header and attached to request-scoped logs.

### HTTP observability
- Request completion logs include method/path/status/duration/user-agent/IP.
- Error logs include correlation IDs for traceability.
