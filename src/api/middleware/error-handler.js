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
 * Centralised error response format.
 * @type {import('express').ErrorRequestHandler}
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

  log.error('Request error', {
    method: req.method,
    url: req.url,
    status,
    error: message,
    stack: config.env !== 'production' ? err.stack : undefined,
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
