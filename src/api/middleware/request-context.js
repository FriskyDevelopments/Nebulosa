/**
 * Request context middleware for correlation IDs and structured request logs.
 */
'use strict';

const { generateId } = require('../../core/utilities');
const { withContext } = require('../../core/logger');

const rootLog = withContext({ module: 'http' });
const CORRELATION_ID_HEADER = 'x-correlation-id';
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

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
