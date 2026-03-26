/**
 * Tests for the authorization module.
 */
'use strict';

const { hasRole, requireRole, ROLES } = require('../auth/authorization');

describe('hasRole', () => {
  it('ADMIN satisfies ADMIN requirement', () => {
    expect(hasRole(ROLES.ADMIN, ROLES.ADMIN)).toBe(true);
  });

  it('ADMIN satisfies USER requirement', () => {
    expect(hasRole(ROLES.ADMIN, ROLES.USER)).toBe(true);
  });

  it('ADMIN satisfies BOT requirement', () => {
    expect(hasRole(ROLES.ADMIN, ROLES.BOT)).toBe(true);
  });

  it('USER satisfies USER requirement', () => {
    expect(hasRole(ROLES.USER, ROLES.USER)).toBe(true);
  });

  it('USER does not satisfy ADMIN requirement', () => {
    expect(hasRole(ROLES.USER, ROLES.ADMIN)).toBe(false);
  });

  it('BOT does not satisfy USER requirement', () => {
    expect(hasRole(ROLES.BOT, ROLES.USER)).toBe(false);
  });
});

describe('requireRole middleware', () => {
  function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('calls next when user has sufficient role', () => {
    const middleware = requireRole(ROLES.USER);
    const req = { user: { role: ROLES.USER } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is not set', () => {
    const middleware = requireRole(ROLES.USER);
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is insufficient', () => {
    const middleware = requireRole(ROLES.ADMIN);
    const req = { user: { role: ROLES.USER } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
