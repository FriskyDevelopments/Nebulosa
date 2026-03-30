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

/**
 * Initialize required dependencies and start the HTTP server listening on the configured port.
 *
 * Awaits dependency initialization before creating the listener and logs startup information.
 *
 * @returns {import('http').Server} The started HTTP server instance.
 */
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

/**
 * Shut down the HTTP server and application resources in response to a termination signal.
 *
 * Closes the listening server if it exists, attempts to disconnect the Prisma client (logs a warning on failure), logs completion, and exits the process with code 0.
 * @param {string} signal - The termination signal that initiated shutdown (e.g., 'SIGTERM' or 'SIGINT').
 */
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
