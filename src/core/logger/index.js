/**
 * Structured logger using Winston.
 * Outputs JSON in production and structured pretty logs in development.
 */
'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('../config');

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'authorization', 'cookie', 'apiKey', 'key', 'url'];

function redactUrlCredentials(value) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
      return parsed.toString();
    }
    return value;
  } catch {
    return value;
  }
}

function sanitizeMeta(value, parentKey = '') {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMeta(entry, parentKey));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const lowered = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowered.includes(sensitive.toLowerCase()));
        if (isSensitive) {
          return [key, '[REDACTED]'];
        }

        if (lowered.includes('url')) {
          return [key, redactUrlCredentials(entry)];
        }

        return [key, sanitizeMeta(entry, key)];
      })
    );
  }

  if (typeof value === 'string' && parentKey.toLowerCase().includes('url')) {
    return redactUrlCredentials(value);
  }

  return value;
}

const redactFormat = format((info) => sanitizeMeta(info));

const productionFormat = format.combine(
  redactFormat(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const developmentFormat = format.combine(
  redactFormat(),
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const renderedMeta = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${renderedMeta}`;
  })
);

const logger = createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'stixmagic-platform', mode: config.mode },
  transports: [new transports.Console()],
  silent: config.env === 'test',
});

function withContext(meta) {
  return logger.child(meta);
}

module.exports = { logger, withContext, sanitizeMeta, redactUrlCredentials };
