/**
 * Shared utilities used across all platform modules.
 */
'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Generates a new UUID v4.
 * @returns {string}
 */
function generateId() {
  return uuidv4();
}

/**
 * Wraps an async express route handler to forward errors to next().
 * @param {Function} fn
 * @returns {Function}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Builds a standardised pagination meta object.
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 * @returns {{ total: number, page: number, limit: number, pages: number }}
 */
function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Parses pagination query params from an Express request.
 * @param {{ query: Record<string, string> }} req
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Returns a sanitised copy of an object with sensitive fields removed.
 * @param {Record<string, unknown>} obj
 * @param {string[]} fields
 * @returns {Record<string, unknown>}
 */
function omit(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

/**
 * Delays execution for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { generateId, asyncHandler, paginationMeta, parsePagination, omit, sleep };
