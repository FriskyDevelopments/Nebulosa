/**
 * Dependency lifecycle and readiness manager.
 * Startup is non-fatal for transient dependency outages.
 */
'use strict';

const Redis = require('ioredis');
const config = require('../config');
const { getPrismaClient } = require('../../database/client');
const { withContext } = require('../logger');

const log = withContext({ module: 'dependencies' });

const dependencyState = {
  mode: config.mode,
  startedAt: new Date().toISOString(),
  db: { configured: Boolean(config.db.url), ready: false, checkedAt: null, error: null },
  redis: { configured: Boolean(config.redis.url), ready: false, checkedAt: null, error: null },
};

let refreshInFlight = null;

/**
 * Checks database dependency availability and records its status.
 *
 * @returns {{configured: boolean, ready: boolean, checkedAt: string, error: string|null}} An object describing the probe result:
 *  - `configured`: whether `DATABASE_URL` is configured.
 *  - `ready`: `true` if a connection and a simple query succeeded, `false` otherwise.
 *  - `checkedAt`: ISO timestamp when the check was performed.
 *  - `error`: error message when not ready or configuration is missing, otherwise `null`.
 */
async function probeDatabase() {
  const result = { configured: Boolean(config.db.url), ready: false, checkedAt: new Date().toISOString(), error: null };

  if (!result.configured) {
    result.error = 'DATABASE_URL is not configured';
    return result;
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    result.ready = true;
  } catch (err) {
    result.error = err.message;
    log.warn('Database dependency not ready', { error: err.message });
  }

  return result;
}

/**
 * Masks credentials in a Redis URL by replacing username and password with asterisks.
 * @param {string} url - The Redis URL to mask.
 * @returns {string} The URL with credentials masked, or the original value if parsing fails.
 */
function maskRedisUrl(url) {
  if (typeof url !== 'string') {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Checks Redis availability and returns a status object describing configuration, readiness, check time, and any error.
 *
 * Attempts to connect to the configured Redis URL and perform a ping; on success the status will indicate readiness,
 * otherwise the error field will contain the failure message. The function always returns a status object and does not throw.
 *
 * @returns {{configured: boolean, ready: boolean, checkedAt: string, error: string|null}} Status object:
 *  - `configured`: `true` if `config.redis.url` is set, `false` otherwise.
 *  - `ready`: `true` if a successful connect+ping occurred, `false` otherwise.
 *  - `checkedAt`: ISO string timestamp when the probe was performed.
 *  - `error`: error message when not ready or when configuration is missing, or `null` when ready.
 */
async function probeRedis() {
  const result = { configured: Boolean(config.redis.url), ready: false, checkedAt: new Date().toISOString(), error: null };

  if (!result.configured) {
    result.error = 'REDIS_URL is not configured';
    return result;
  }

  const redis = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    enableOfflineQueue: false,
  });

  try {
    await redis.connect();
    await redis.ping();
    result.ready = true;
  } catch (err) {
    result.error = err.message;
    log.warn('Redis dependency not ready', { error: err.message, redisUrl: maskRedisUrl(config.redis.url) });
  } finally {
    redis.disconnect();
  }

  return result;
}

/**
 * Refreshes the known readiness and metadata for external dependencies by probing each and updating the shared state.
 *
 * Updates dependencyState.db, dependencyState.redis, and dependencyState.lastUpdatedAt. Concurrent invocations share a single in-flight refresh to avoid duplicate probes.
 * @returns {object} The updated dependencyState object containing per-dependency probe results and metadata.
 */
async function refreshDependencyState() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const [db, redis] = await Promise.all([probeDatabase(), probeRedis()]);
    dependencyState.db = db;
    dependencyState.redis = redis;
    dependencyState.lastUpdatedAt = new Date().toISOString();
    return dependencyState;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Perform a best-effort initialization of external dependencies.
 *
 * Attempts to refresh the dependency readiness state without throwing on transient failures.
 * @returns {Object} The current dependency state containing per-dependency readiness, configuration, timestamps, and any error messages.
 */
async function createDependencies() {
  // Best-effort bootstrap: never throw for transient dependency outages.
  return refreshDependencyState();
}

/**
 * Determine which external dependencies are required for the current runtime mode.
 * @returns {string[]} An array of dependency names required for the configured mode (e.g. `['db']`, `['db','redis']`, or `[]`).
 */
function requiredDependenciesForMode() {
  switch (config.mode) {
    case 'worker':
      return ['db', 'redis'];
    case 'api':
      return ['db'];
    case 'bot':
      return [];
    default:
      return [];
  }
}

/**
 * Provide a snapshot of the current dependency state augmented with which dependencies are required for the current mode.
 * @returns {{mode: string, startedAt: (number|null), lastUpdatedAt: (number|null), db: object, redis: object, required: string[]}} The current dependency state object with a `required` array listing dependency names required by the configured mode.
 */
function getDependencyState() {
  return {
    ...dependencyState,
    required: requiredDependenciesForMode(),
  };
}

/**
 * Check whether all dependencies required for the current mode are ready.
 * @returns {boolean} `true` if every dependency required for the current mode is ready, `false` otherwise.
 */
function isReady() {
  const required = requiredDependenciesForMode();
  return required.every((dependencyName) => dependencyState[dependencyName] && dependencyState[dependencyName].ready);
}

module.exports = {
  createDependencies,
  refreshDependencyState,
  getDependencyState,
  isReady,
};