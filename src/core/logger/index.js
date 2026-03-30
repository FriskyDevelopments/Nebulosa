/**
 * Structured logger using Winston.
 * Outputs JSON in production and structured pretty logs in development.
 */
'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('../config');

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'authorization', 'cookie', 'apiKey', 'key', 'url'];

/**
 * Redacts username and password credentials in a URL string by replacing them with '***'.
 *
 * @param {*} value - Input to inspect; non-string values are returned unchanged.
 * @returns {*} The input string with `username` and `password` replaced by `'***'` when URL credentials are present, otherwise the original input.
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
 * Sanitize log metadata by redacting sensitive fields and removing credentials from URLs.
 *
 * Traverses arrays and objects and:
 * - Replaces values for object keys that match configured sensitive substrings (e.g., "password", "secret", "token") with `"[REDACTED]"`.
 * - For keys containing `"url"`, redacts username and password embedded in URL strings.
 * - For string values whose parent key contains `"url"`, redacts URL credentials as well.
 *
 * @param {*} value - The value to sanitize (primitive, array, or object).
 * @param {string} [parentKey=''] - Parent object's key name used to decide URL-based redaction for string children.
 * @returns {*} The sanitized value with sensitive entries replaced by `"[REDACTED]"` and URL credentials removed where applicable.
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
