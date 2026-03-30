/**
 * Tests for startup config validation contracts.
 */
'use strict';

const { Settings } = require('../core/config');

describe('Settings.validate', () => {
  it('fails when api mode has no DATABASE_URL', () => {
    const settings = new Settings({ NODE_ENV: 'production', APP_MODE: 'api', PORT: '3000', JWT_SECRET: 'x' });
    expect(() => settings.validate()).toThrow('DATABASE_URL is required for APP_MODE=api');
  });

  it('fails when worker mode has no REDIS_URL', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'worker',
      DATABASE_URL: 'postgres://db',
      JWT_SECRET: 'x',
    });
    expect(() => settings.validate()).toThrow('REDIS_URL is required for APP_MODE=worker');
  });

  it('fails when api port is out of range', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '70000',
      JWT_SECRET: 'x',
    });
    expect(() => settings.validate()).toThrow('PORT must be an integer between 1 and 65535 for APP_MODE=api');
  });

  it('passes with valid api config', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '3000',
      JWT_SECRET: 'x',
      API_KEY_SALT_ROUNDS: '10',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX: '100',
    });
    expect(() => settings.validate()).not.toThrow();
  });

  it('fails when bot mode has no TELEGRAM_BOT_TOKEN', () => {
    const settings = new Settings({ NODE_ENV: 'development', APP_MODE: 'bot' });
    expect(() => settings.validate()).toThrow('TELEGRAM_BOT_TOKEN is required for APP_MODE=bot');
  });

  it('fails when bot mode in production has no TELEGRAM_WEBHOOK_URL', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'bot',
      TELEGRAM_BOT_TOKEN: 'fake-token',
      JWT_SECRET: 'x',
    });
    expect(() => settings.validate()).toThrow('TELEGRAM_WEBHOOK_URL is required in production for APP_MODE=bot');
  });

  it('fails when production uses default JWT_SECRET', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '3000',
      JWT_SECRET: 'change-me-in-production',
    });
    expect(() => settings.validate()).toThrow('JWT_SECRET must be set in production');
  });

  it('fails when NODE_ENV is invalid', () => {
    const settings = new Settings({ NODE_ENV: 'invalid', APP_MODE: 'api' });
    expect(() => settings.validate()).toThrow('NODE_ENV must be one of: development, test, production');
  });

  it('fails when APP_MODE is invalid', () => {
    const settings = new Settings({ NODE_ENV: 'development', APP_MODE: 'invalid' });
    expect(() => settings.validate()).toThrow('APP_MODE must be one of: api, worker, bot');
  });

  it('fails when API_KEY_SALT_ROUNDS is below 4', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '3000',
      JWT_SECRET: 'x',
      API_KEY_SALT_ROUNDS: '3',
    });
    expect(() => settings.validate()).toThrow('API_KEY_SALT_ROUNDS must be an integer between 4 and 15');
  });

  it('fails when API_KEY_SALT_ROUNDS is above 15', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '3000',
      JWT_SECRET: 'x',
      API_KEY_SALT_ROUNDS: '16',
    });
    expect(() => settings.validate()).toThrow('API_KEY_SALT_ROUNDS must be an integer between 4 and 15');
  });

  it('fails when RATE_LIMIT_WINDOW_MS is below 1000', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '3000',
      JWT_SECRET: 'x',
      RATE_LIMIT_WINDOW_MS: '999',
    });
    expect(() => settings.validate()).toThrow('RATE_LIMIT_WINDOW_MS must be an integer >= 1000');
  });

  it('fails when RATE_LIMIT_MAX is below 1', () => {
    const settings = new Settings({
      NODE_ENV: 'production',
      APP_MODE: 'api',
      DATABASE_URL: 'postgres://db',
      PORT: '3000',
      JWT_SECRET: 'x',
      RATE_LIMIT_MAX: '0',
    });
    expect(() => settings.validate()).toThrow('RATE_LIMIT_MAX must be an integer >= 1');
  });
});