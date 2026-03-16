/**
 * Structured logger using Winston.
 * Outputs JSON in production, pretty-print in development.
 */
'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('../config');

const { combine, timestamp, errors, json, colorize, simple } = format;

const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

const logger = createLogger({
  level: config.logging.level,
  format: config.env === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'stixmagic-platform' },
  transports: [
    new transports.Console(),
  ],
  silent: config.env === 'test',
});

/**
 * Creates a child logger with additional context metadata.
 * @param {Record<string, unknown>} meta
 * @returns {import('winston').Logger}
 */
function withContext(meta) {
  return logger.child(meta);
}

module.exports = { logger, withContext };
