/**
 * Authentication middleware.
 * Supports both JWT Bearer tokens and API keys (x-api-key header).
 */
'use strict';

const { verifyToken, verifyApiKey } = require('../../auth/authentication');
const { UserRepository } = require('../../database/repositories/user.repository');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'auth-middleware' });

/**
 * Populates `req.user` from a JWT Bearer token or API key.
 * Returns 401 if no valid credential is present.
 *
 * @type {import('express').RequestHandler}
 */
async function authenticate(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    if (apiKey) {
      return await authenticateWithApiKey(req, res, next, apiKey);
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      return authenticateWithJwt(req, res, next, token);
    }

    return res.status(401).json({ error: 'Missing authentication credentials' });
  } catch (err) {
    log.error('Authentication error', { error: err.message });
    return res.status(401).json({ error: 'Invalid authentication credentials' });
  }
}

function authenticateWithJwt(req, res, next, token) {
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function authenticateWithApiKey(req, res, next, rawKey) {
  const repo = new UserRepository();
  const db = repo.db;

  // Look up all active API keys and find a matching one
  // In production, index / use a prefix for lookup efficiency
  const apiKeys = await db.apiKey.findMany({ where: { isActive: true }, include: { user: true } });

  for (const apiKeyRecord of apiKeys) {
    const match = await verifyApiKey(rawKey, apiKeyRecord.keyHash);
    if (match) {
      // Update last-used timestamp asynchronously
      db.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      req.user = {
        id: apiKeyRecord.user.id,
        email: apiKeyRecord.user.email,
        role: apiKeyRecord.user.role,
      };
      return next();
    }
  }

  return res.status(401).json({ error: 'Invalid API key' });
}

/**
 * Optional authentication – populates req.user if credentials are present
 * but does not reject unauthenticated requests.
 *
 * @type {import('express').RequestHandler}
 */
async function optionalAuthenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  if (!apiKey && (!authHeader || !authHeader.startsWith('Bearer '))) {
    return next();
  }

  return authenticate(req, res, next);
}

module.exports = { authenticate, optionalAuthenticate };
