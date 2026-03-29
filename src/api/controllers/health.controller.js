/**
 * Health controller – liveness and readiness probes.
 */
'use strict';

const config = require('../../core/config');
const { getDependencyState, isReady, refreshDependencyState } = require('../../core/dependencies');

async function healthCheck(req, res) {
  return res.status(200).json({
    status: 'ok',
    env: config.env,
    mode: config.mode,
    timestamp: new Date().toISOString(),
  });
}

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
