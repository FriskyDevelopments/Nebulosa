/**
 * Request validation middleware using Zod schemas.
 */
'use strict';

const { ZodError } = require('zod');

/**
 * Creates a validation middleware that validates req.body against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodErrors(result.error),
      });
    }
    req.body = result.data;
    return next();
  };
}

/**
 * Creates a validation middleware that validates req.query against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodErrors(result.error),
      });
    }
    req.query = result.data;
    return next();
  };
}

/**
 * Creates a validation middleware that validates req.params against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodErrors(result.error),
      });
    }
    req.params = result.data;
    return next();
  };
}

/**
 * Converts a ZodError into a flat array of human-readable messages.
 * @param {ZodError} error
 * @returns {Array<{ path: string, message: string }>}
 */
function formatZodErrors(error) {
  return error.issues.map((e) => ({
    path: e.path.join('.'),
    message: e.message,
  }));
}

module.exports = { validateBody, validateQuery, validateParams };
