import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSession, requireAuth } from '../../nebulosa/service';
import { nebulosaState, Operator } from '../../nebulosa/state';
import { config } from '../../nebulosa/config';
import { Request, Response, NextFunction } from 'express';

vi.mock('../../nebulosa/config', () => ({
  config: {
    environment: 'test',
    sessionTtlMs: 1000 * 60 * 20,
    allowedOperators: ['admin', 'operator'],
    sessionSecret: 'test-secret',
    executorSharedSecret: 'test-executor-secret',
    failedCommandThreshold: 5,
  }
}));

describe('service - Authentication', () => {
  beforeEach(() => {
    nebulosaState.sessions.clear();
    nebulosaState.audit = [];

    // We expect state.ts to seed op_admin, op_operator, op_viewer.
    // Let's verify our assumptions about password by using the default seeded one or adding our own
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('should create a session and return token for valid login', () => {
      // The default password seeded in state.ts for admin is "ChangeMe_Admin123!"
      // unless NEBULOSA_ADMIN_PASSWORD was set, let's inject a known good user just in case
      const testSalt = 'somesalt';
      const testHash = require('crypto').scryptSync('password123', testSalt, 64).toString('hex');
      nebulosaState.operators.set('testadmin', {
        id: 'op_testadmin',
        username: 'testadmin',
        role: 'admin',
        salt: testSalt,
        passwordHash: testHash
      });
      // Add to config allowlist
      config.allowedOperators.push('testadmin');

      const result = createSession('testadmin', 'password123');

      expect(result).not.toBeNull();
      expect(result?.token).toBeDefined();
      expect(result?.operator.username).toBe('testadmin');

      expect(nebulosaState.sessions.size).toBe(1);

      const session = nebulosaState.sessions.get(result!.token);
      expect(session).toBeDefined();
      expect(session?.operatorId).toBe('op_testadmin');

      expect(nebulosaState.audit[0].event).toBe('auth.login_success');
      expect(nebulosaState.audit[0].actor).toBe('testadmin');
    });

    it('should return null and audit on invalid password', () => {
      const testSalt = 'somesalt';
      const testHash = require('crypto').scryptSync('password123', testSalt, 64).toString('hex');
      nebulosaState.operators.set('testadmin2', {
        id: 'op_testadmin2',
        username: 'testadmin2',
        role: 'admin',
        salt: testSalt,
        passwordHash: testHash
      });

      const result = createSession('testadmin2', 'wrong_password');

      expect(result).toBeNull();
      expect(nebulosaState.sessions.size).toBe(0);

      expect(nebulosaState.audit[0].event).toBe('auth.login_failed');
      expect(nebulosaState.audit[0].metadata.reason).toBe('invalid_credentials');
    });

    it('should return null and audit if user is not in allowedOperators list', () => {
      const testSalt = 'somesalt';
      const testHash = require('crypto').scryptSync('password123', testSalt, 64).toString('hex');
      nebulosaState.operators.set('unallowed_user', {
        id: 'op_unallowed',
        username: 'unallowed_user',
        role: 'viewer',
        salt: testSalt,
        passwordHash: testHash
      });
      // Ensure it's not in allowlist
      const index = config.allowedOperators.indexOf('unallowed_user');
      if (index > -1) config.allowedOperators.splice(index, 1);

      const result = createSession('unallowed_user', 'password123');

      expect(result).toBeNull();
      expect(nebulosaState.audit[0].event).toBe('auth.login_denied');
      expect(nebulosaState.audit[0].metadata.reason).toBe('allowlist_block');
    });
  });
});

  describe('requireAuth middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      mockNext = vi.fn();
    });

    it('should reject requests without session token', () => {
      const middleware = requireAuth('command:view');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'unauthorized' }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid session token', () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      const middleware = requireAuth('command:view');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'unauthorized' }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject and delete expired session', () => {
      const token = 'expired-token';
      nebulosaState.sessions.set(token, {
        token,
        operatorId: 'op_test',
        expiresAt: Date.now() - 1000 // Expired 1 sec ago
      });

      mockReq.headers!.authorization = `Bearer ${token}`;
      const middleware = requireAuth('command:view');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nebulosaState.sessions.has(token)).toBe(false);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when operator has insufficient permissions', () => {
      const token = 'valid-token';
      nebulosaState.operators.set('viewer', {
        id: 'op_viewer',
        username: 'viewer',
        role: 'viewer',
        salt: 'salt',
        passwordHash: 'hash'
      });
      nebulosaState.sessions.set(token, {
        token,
        operatorId: 'op_viewer',
        expiresAt: Date.now() + 10000
      });

      mockReq.headers!.authorization = `Bearer ${token}`;
      // require write access, which viewer doesn't have
      const middleware = requireAuth('command:write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'forbidden' }));
      expect(mockNext).not.toHaveBeenCalled();

      expect(nebulosaState.audit[0].event).toBe('auth.permission_denied');
      expect(nebulosaState.audit[0].actor).toBe('viewer');
    });

    it('should allow valid request with correct permissions and refresh session', () => {
      const token = 'valid-token';
      nebulosaState.operators.set('admin', {
        id: 'op_admin',
        username: 'admin',
        role: 'admin',
        salt: 'salt',
        passwordHash: 'hash'
      });

      const originalExpiresAt = Date.now() + 10000;
      nebulosaState.sessions.set(token, {
        token,
        operatorId: 'op_admin',
        expiresAt: originalExpiresAt
      });

      mockReq.headers!.authorization = `Bearer ${token}`;

      const middleware = requireAuth('command:write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).operator).toBeDefined();
      expect((mockReq as any).operator.username).toBe('admin');

      // Check session refreshed
      const session = nebulosaState.sessions.get(token);
      expect(session!.expiresAt).toBeGreaterThan(originalExpiresAt);
    });

    it('should extract session from cookie if Bearer is missing', () => {
      const token = 'valid-token-cookie';
      nebulosaState.operators.set('admin2', {
        id: 'op_admin2',
        username: 'admin2',
        role: 'admin',
        salt: 'salt',
        passwordHash: 'hash'
      });
      nebulosaState.sessions.set(token, {
        token,
        operatorId: 'op_admin2',
        expiresAt: Date.now() + 10000
      });

      mockReq.headers!.cookie = `other_cookie=123; nb_session=${token}; another=456`;

      const middleware = requireAuth('command:write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).operator.username).toBe('admin2');
    });
  });
