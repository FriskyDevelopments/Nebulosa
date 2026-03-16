/**
 * Server entry point.
 * Starts the HTTP server.
 */
'use strict';

const { createApp } = require('./api/app');
const config = require('./core/config');
const { logger } = require('./core/logger');

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Stix Magic Platform started`, {
    env: config.env,
    port: config.port,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received – shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received – shutting down');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server };
