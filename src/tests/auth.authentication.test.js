/**
 * Tests for the authentication module.
 */
'use strict';

process.env.NODE_ENV = 'test';

const {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  generateSecureToken,
} = require('../auth/authentication');

describe('JWT tokens', () => {
  const user = { id: 'user-123', email: 'test@example.com', role: 'USER' };

  it('signAccessToken returns a string', () => {
    const token = signAccessToken(user);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyToken returns correct payload', () => {
    const token = signAccessToken(user);
    const payload = verifyToken(token);
    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.role).toBe(user.role);
  });

  it('signRefreshToken payload has type=refresh', () => {
    const token = signRefreshToken(user.id);
    const payload = verifyToken(token);
    expect(payload.type).toBe('refresh');
    expect(payload.sub).toBe(user.id);
  });

  it('verifyToken throws on tampered token', () => {
    const token = signAccessToken(user);
    expect(() => verifyToken(token + 'tampered')).toThrow();
  });
});

describe('Password hashing', () => {
  it('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('mySecret123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('comparePassword returns true for correct password', async () => {
    const hash = await hashPassword('correctPassword');
    expect(await comparePassword('correctPassword', hash)).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const hash = await hashPassword('correctPassword');
    expect(await comparePassword('wrongPassword', hash)).toBe(false);
  });
});

describe('API keys', () => {
  it('generateApiKey returns raw key with sm_ prefix', () => {
    const { raw, prefix } = generateApiKey();
    expect(raw).toMatch(/^sm_/);
    expect(prefix).toHaveLength(10);
  });

  it('verifyApiKey validates raw key against hash', async () => {
    const { raw } = generateApiKey();
    const hash = await hashApiKey(raw);
    expect(await verifyApiKey(raw, hash)).toBe(true);
    expect(await verifyApiKey('wrong', hash)).toBe(false);
  });
});

describe('generateSecureToken', () => {
  it('returns a hex string of correct length', () => {
    const token = generateSecureToken(16);
    expect(token).toHaveLength(32); // 16 bytes * 2 hex chars
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSecureToken()));
    expect(tokens.size).toBe(50);
  });
});
