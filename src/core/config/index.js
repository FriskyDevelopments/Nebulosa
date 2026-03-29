/**
 * Application configuration loader.
 * Reads from environment variables and provides validated runtime settings.
 */
'use strict';

require('dotenv').config();

const APP_MODES = ['api', 'worker', 'bot'];
const ENVIRONMENTS = ['development', 'test', 'production'];

class Settings {
  constructor(env = process.env) {
    this.env = env.NODE_ENV || 'development';
    this.mode = env.APP_MODE || 'api';

    this.port = Number.parseInt(env.PORT || '3000', 10);

    this.db = {
      url: env.DATABASE_URL || '',
    };

    this.redis = {
      url: env.REDIS_URL || '',
    };

    this.jwt = {
      secret: env.JWT_SECRET || 'change-me-in-production',
      expiresIn: env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d',
    };

    this.apiKey = {
      headerName: 'x-api-key',
      salt: Number.parseInt(env.API_KEY_SALT_ROUNDS || '10', 10),
    };

    this.telegram = {
      botToken: env.TELEGRAM_BOT_TOKEN || '',
      webhookUrl: env.TELEGRAM_WEBHOOK_URL || '',
    };

    this.storage = {
      provider: env.STORAGE_PROVIDER || 'local',
      localPath: env.STORAGE_LOCAL_PATH || './uploads',
      s3Bucket: env.S3_BUCKET || '',
      s3Region: env.S3_REGION || 'us-east-1',
      s3AccessKey: env.AWS_ACCESS_KEY_ID || '',
      s3SecretKey: env.AWS_SECRET_ACCESS_KEY || '',
    };

    this.cors = {
      origins: (env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((origin) => origin.trim()).filter(Boolean),
    };

    this.rateLimit = {
      windowMs: Number.parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      max: Number.parseInt(env.RATE_LIMIT_MAX || '100', 10),
    };

    this.logging = {
      level: env.LOG_LEVEL || 'info',
      format: env.LOG_FORMAT || (this.env === 'production' ? 'json' : 'pretty'),
    };
  }

  /**
   * Validates startup configuration. Configuration errors are fatal.
   */
  validate() {
    if (!ENVIRONMENTS.includes(this.env)) {
      throw new Error(`NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')}`);
    }

    if (!APP_MODES.includes(this.mode)) {
      throw new Error(`APP_MODE must be one of: ${APP_MODES.join(', ')}`);
    }

    if (this.mode === 'api') {
      if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535 for APP_MODE=api');
      }
    }

    if (!Number.isInteger(this.apiKey.salt) || this.apiKey.salt < 4 || this.apiKey.salt > 15) {
      throw new Error('API_KEY_SALT_ROUNDS must be an integer between 4 and 15');
    }

    if (!Number.isInteger(this.rateLimit.windowMs) || this.rateLimit.windowMs < 1000) {
      throw new Error('RATE_LIMIT_WINDOW_MS must be an integer >= 1000');
    }

    if (!Number.isInteger(this.rateLimit.max) || this.rateLimit.max < 1) {
      throw new Error('RATE_LIMIT_MAX must be an integer >= 1');
    }

    if (this.env === 'production' && this.jwt.secret === 'change-me-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }

    if (['api', 'worker'].includes(this.mode) && !this.db.url) {
      throw new Error(`DATABASE_URL is required for APP_MODE=${this.mode}`);
    }

    if (this.mode === 'worker' && !this.redis.url) {
      throw new Error('REDIS_URL is required for APP_MODE=worker');
    }

    if (this.mode === 'bot' && !this.telegram.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for APP_MODE=bot');
    }

    if (this.env === 'production' && this.mode === 'bot' && !this.telegram.webhookUrl) {
      throw new Error('TELEGRAM_WEBHOOK_URL is required in production for APP_MODE=bot');
    }
  }
}

const config = new Settings();

if (config.env !== 'test') {
  config.validate();
}

module.exports = config;
module.exports.Settings = Settings;
module.exports.APP_MODES = APP_MODES;
module.exports.ENVIRONMENTS = ENVIRONMENTS;
