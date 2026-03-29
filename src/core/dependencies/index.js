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
    log.warn('Redis dependency not ready', { error: err.message, redisUrl: config.redis.url });
  } finally {
    redis.disconnect();
  }

  return result;
}

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

async function createDependencies() {
  // Best-effort bootstrap: never throw for transient dependency outages.
  return refreshDependencyState();
}

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

function getDependencyState() {
  return {
    ...dependencyState,
    required: requiredDependenciesForMode(),
  };
}

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
