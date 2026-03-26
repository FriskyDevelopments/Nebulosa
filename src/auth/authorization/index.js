/**
 * Role-based authorization helpers.
 */
'use strict';

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  USER: 'USER',
  BOT: 'BOT',
});

/**
 * Returns true if role has at least the required permission level.
 * Order: ADMIN > USER > BOT
 * @param {string} role
 * @param {string} required
 * @returns {boolean}
 */
function hasRole(role, required) {
  const hierarchy = [ROLES.BOT, ROLES.USER, ROLES.ADMIN];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(required);
}

/**
 * Express middleware factory: requires the user to have at least `requiredRole`.
 * Expects `req.user` to be populated by the authentication middleware.
 *
 * @param {string} requiredRole
 * @returns {import('express').RequestHandler}
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!hasRole(req.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Convenience middleware: admin-only route.
 */
const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Convenience middleware: authenticated users and above.
 */
const requireUser = requireRole(ROLES.USER);

module.exports = { ROLES, hasRole, requireRole, requireAdmin, requireUser };
