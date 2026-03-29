/**
 * Structured error-handling middleware.
 * Must be registered as the last middleware in the Express chain.
 */
'use strict';

const { ZodError } = require('zod');
const { withContext } = require('../../core/logger');
const config = require('../../core/config');

const log = withContext({ module: 'error-handler' });

/**
 * Express error-handling middleware that converts thrown errors into JSON HTTP responses.
 *
 * For Zod validation errors responds with HTTP 400 and a `details` array of `{ path, message }`.
 * For other errors determines status from `err.status || err.statusCode || 500` and message from `err.message || 'Internal server error'`.
 * Logs the error using `req.log` when present (falls back to module logger) and includes `req.correlationId` and, when not in production, the error stack.
 * When not in production and an error stack exists, the stack is included in the JSON response body.
 *
 * @type {import('express').ErrorRequestHandler}
 * @param {Error} err - The error object; may include `status` or `statusCode` and `message`.
 * @param {import('express').Request} req - The request; may provide `log` (per-request logger) and `correlationId` used for logging.
 * @param {import('express').Response} res - The response used to send the JSON error body.
 * @param {import('express').NextFunction} next - Next middleware (not called).
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  const requestLog = req.log || log;

  requestLog.error('Request error', {
    method: req.method,
    url: req.url,
    status,
    error: message,
    stack: config.env !== 'production' ? err.stack : undefined,
    correlationId: req.correlationId,
  });

  const body = { error: message };

  if (config.env !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}

/**
 * 404 handler – catches requests that didn't match any route.
 * @type {import('express').RequestHandler}
 */
function notFound(req, res) {
  return res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
