/**
 * Server entry point.
 * Starts the HTTP server.
 */
'use strict';

const { createApp } = require('./app');
const config = require('../core/config');
const { logger } = require('../core/logger');
const { createDependencies } = require('../core/dependencies');
const { getPrismaClient } = require('../database/client');

const app = createApp();

let server;

async function start() {
  await createDependencies();

  server = app.listen(config.port, () => {
    logger.info('Stix Magic Platform started', {
      env: config.env,
      mode: config.mode,
      port: config.port,
    });
  });

  return server;
}

async function shutdown(signal) {
  logger.info(`${signal} received – shutting down gracefully`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await getPrismaClient().$disconnect();
  } catch (err) {
    logger.warn('Error disconnecting Prisma during shutdown', { error: err.message });
  }

  logger.info('HTTP server closed');
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    logger.error('Unhandled shutdown error', { error: err.message });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    logger.error('Unhandled shutdown error', { error: err.message });
    process.exit(1);
  });
});

start().catch((err) => {
  logger.error('Failed to start API server', { error: err.message });
  process.exit(1);
});

module.exports = { app, start };
