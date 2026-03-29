/**
 * Request context middleware for correlation IDs and structured request logs.
 */
'use strict';

const { generateId } = require('../../core/utilities');
const { withContext } = require('../../core/logger');

const rootLog = withContext({ module: 'http' });
const CORRELATION_ID_HEADER = 'x-correlation-id';
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Normalize and validate a correlation ID header value.
 *
 * @param {*} rawValue - The raw value read from the correlation ID header (may be non-string).
 * @returns {string} A trimmed, validated correlation ID (allowed characters: A–Z, a–z, 0–9, `. _ : -`) with length between 8 and 128; if the input is invalid or not a string, returns a generated fallback ID.
 */
function normalizeCorrelationId(rawValue) {
  if (typeof rawValue !== 'string') {
    return generateId();
  }

  const candidate = rawValue.trim();
  if (!CORRELATION_ID_PATTERN.test(candidate)) {
    return generateId();
  }

  return candidate;
}

/**
 * Attach a per-request correlation ID and structured logger to the request, set the correlation ID response header, and log request completion with duration.
 *
 * The middleware normalizes or generates a correlation ID from the incoming `x-correlation-id` header, sets `req.correlationId`, creates `req.log` bound to `{ correlationId, method, path }`, writes the correlation ID to the response header, and registers a handler that logs an `HTTP request completed` event on response finish with `statusCode`, `durationMs`, `userAgent`, and `ip`.
 *
 * @param {import('http').IncomingMessage & { correlationId?: string, log?: any, method?: string, path?: string, headers: Record<string,string|undefined>, ip?: string }} req - Express request object; the middleware will set `req.correlationId` and `req.log`.
 * @param {import('http').ServerResponse & { setHeader: Function, statusCode?: number, on: Function }} res - Express response object; the middleware will set the `x-correlation-id` header and listen for the `finish` event.
 * @param {Function} next - Express next middleware function.
 */
function requestContext(req, res, next) {
  const correlationId = normalizeCorrelationId(req.headers[CORRELATION_ID_HEADER]);
  req.correlationId = correlationId;
  req.log = rootLog.child({ correlationId, method: req.method, path: req.path });
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    req.log.info('HTTP request completed', {
      statusCode: res.statusCode,
      durationMs: Number(elapsedMs.toFixed(2)),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
}

module.exports = { requestContext, normalizeCorrelationId, CORRELATION_ID_HEADER };
