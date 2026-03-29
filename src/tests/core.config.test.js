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
});
