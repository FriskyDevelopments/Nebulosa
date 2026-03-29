/**
 * Structured logger using Winston.
 * Outputs JSON in production and structured pretty logs in development.
 */
'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('../config');

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'authorization', 'cookie', 'apiKey', 'key', 'url'];

/**
 * Redacts username and password credentials from a URL by replacing them with `'***'`.
 * 
 * @param {*} value - Value to inspect; if it is a URL string containing credentials, those credentials will be redacted.
 * @returns {*} The URL string with `username` and `password` replaced by `'***'` when credentials are present; otherwise returns the original value unchanged.
 */
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

/**
 * Recursively sanitizes metadata by redacting sensitive values and removing URL credentials.
 *
 * Processes arrays and objects recursively; for object keys that match known sensitive substrings the value is replaced with "[REDACTED]". Keys containing "url" (or when the parent key contains "url" for string values) have their credentials redacted via `redactUrlCredentials`.
 * @param {*} value - The value to sanitize (may be a primitive, array, or object).
 * @param {string} [parentKey=''] - The parent object's key name used to decide URL-based redaction for string children.
 * @returns {*} The sanitized value with sensitive entries replaced by `"[REDACTED]"` and URL credentials replaced as applicable.
 */
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

/**
 * Create a child logger that merges additional metadata into each log entry.
 * @param {Object} meta - Metadata to merge into every log entry produced by the returned child logger.
 * @returns {import('winston').Logger} A child Winston logger that includes the provided metadata in its output.
 */
function withContext(meta) {
  return logger.child(meta);
}

module.exports = { logger, withContext, sanitizeMeta, redactUrlCredentials };
