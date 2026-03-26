/**
 * JWT and API-key authentication helpers.
 */
'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../../core/config');
const { generateId } = require('../../core/utilities');

/**
 * Signs a JWT for the given user payload.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string}
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Signs a refresh token (longer-lived).
 * @param {string} userId
 * @returns {string}
 */
function signRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

/**
 * Verifies a JWT and returns its decoded payload.
 * @param {string} token
 * @returns {object}
 * @throws {Error} if verification fails
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a new plain-text API key (to be hashed before storage).
 * @returns {{ raw: string, prefix: string }}
 */
function generateApiKey() {
  const raw = `sm_${generateId().replace(/-/g, '')}`;
  const prefix = raw.slice(0, 10);
  return { raw, prefix };
}

/**
 * Hashes an API key for storage.
 * @param {string} rawKey
 * @returns {Promise<string>}
 */
async function hashApiKey(rawKey) {
  return bcrypt.hash(rawKey, config.apiKey.salt);
}

/**
 * Compares a plain-text API key against its stored hash.
 * @param {string} rawKey
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
async function verifyApiKey(rawKey, storedHash) {
  return bcrypt.compare(rawKey, storedHash);
}

/**
 * Generates a cryptographically random token (for sessions, password resets, etc.).
 * @param {number} [bytes=32]
 * @returns {string} hex string
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  generateSecureToken,
};
