/**
 * Health controller – liveness and readiness probes.
 */
'use strict';

const config = require('../../core/config');

async function healthCheck(req, res) {
  return res.status(200).json({
    status: 'ok',
    env: config.env,
    timestamp: new Date().toISOString(),
  });
}

async function readinessCheck(req, res) {
  // In production: check DB connectivity, Redis, etc.
  return res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { healthCheck, readinessCheck };
