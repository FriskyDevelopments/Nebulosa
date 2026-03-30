/**
 * Worker entry point.
 * Registers all processors and starts listening to queues.
 */
'use strict';

const { logger } = require('../core/logger');
const { createDependencies } = require('../core/dependencies');
const { closeAllQueues } = require('./queues');
const { getPrismaClient } = require('../database/client');

let isShuttingDown = false;

/**
 * Initialize application dependencies and register worker processors.
 *
 * Loads processor modules so they register with Bull and logs when startup completes.
 */
async function startWorkers() {
  await createDependencies();

  // Register processors by requiring them (they self-register via Bull)
  require('./processors/media.processor');
  require('./processors/analytics.processor');
  require('./processors/webhook.processor');

  logger.info('Stix Magic workers started');
}

/**
 * Orchestrates a graceful shutdown in response to a process signal by stopping queue processing, attempting to disconnect the Prisma client, logging progress, and exiting the process.
 * @param {string} signal - Received process signal (e.g., 'SIGINT' or 'SIGTERM') that initiated the shutdown.
 */
async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received – stopping workers`);

  await closeAllQueues();

  try {
    await getPrismaClient().$disconnect();
  } catch (err) {
    logger.warn('Error disconnecting Prisma during worker shutdown', { error: err.message });
  }

  logger.info('Workers stopped cleanly');
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    logger.error('Worker shutdown failed', { error: err.message });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    logger.error('Worker shutdown failed', { error: err.message });
    process.exit(1);
  });
});

startWorkers().catch((err) => {
  logger.error('Failed to start workers', { error: err.message });
  process.exit(1);
});

module.exports = { startWorkers, shutdown };
