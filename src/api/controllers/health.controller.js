/**
 * Health controller – liveness and readiness probes.
 */
'use strict';

const config = require('../../core/config');
const { getDependencyState, isReady, refreshDependencyState } = require('../../core/dependencies');

/**
 * Provides basic liveness information for health checks.
 *
 * Responds with HTTP 200 and a JSON payload containing `status`, `env`, `mode`, and an ISO `timestamp`.
 * @returns {import('express').Response} The HTTP response containing the health JSON.
 */
async function healthCheck(req, res) {
  return res.status(200).json({
    status: 'ok',
    env: config.env,
    mode: config.mode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle the readiness probe by refreshing dependency state and responding with current readiness details.
 *
 * @param {import('express').Request} req - Incoming HTTP request (unused).
 * @param {import('express').Response} res - Express response used to send the readiness JSON payload.
 * @returns {import('express').Response} The HTTP response: `status: 'ready'` with HTTP 200 when all dependencies are ready, otherwise `status: 'not_ready'` with HTTP 503. Both responses include `mode`, `dependencies`, and an ISO 8601 `timestamp`.
 */
async function readinessCheck(req, res) {
  await refreshDependencyState();
  const dependencies = getDependencyState();

  if (isReady()) {
    return res.status(200).json({
      status: 'ready',
      mode: config.mode,
      dependencies,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'not_ready',
    mode: config.mode,
    dependencies,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { healthCheck, readinessCheck };
