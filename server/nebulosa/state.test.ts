import { describe, it, expect, beforeEach } from 'vitest';
import { NebulosaState } from './state';

describe('NebulosaState', () => {
  let state: NebulosaState;

  beforeEach(() => {
    state = new NebulosaState();
  });

  describe('constructor', () => {
    it('should initialize with seeded operators', () => {
      expect(state.operators.size).toBe(3);
      expect(state.operators.has('admin')).toBe(true);
      expect(state.operators.has('operator')).toBe(true);
      expect(state.operators.has('viewer')).toBe(true);
    });

    it('should initialize empty collections for other entities', () => {
      expect(state.sessions.size).toBe(0);
      expect(state.commands.size).toBe(0);
      expect(state.executors.size).toBe(0);
      expect(state.alerts.length).toBe(0);
      expect(state.audit.length).toBe(0);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', () => {
      const admin = state.operators.get('admin')!;
      // Default password from seeded data
      expect(state.verifyPassword(admin, process.env.NEBULOSA_ADMIN_PASSWORD ?? "ChangeMe_Admin123!")).toBe(true);
    });

    it('should return false for incorrect password', () => {
      const admin = state.operators.get('admin')!;
      expect(state.verifyPassword(admin, 'wrong_password')).toBe(false);
    });
  });

  describe('addAudit', () => {
    it('should add an audit entry to the beginning of the array', () => {
      const entry = {
        actor: 'admin',
        event: 'test_event',
        resourceType: 'system',
        resourceId: 'sys_1',
        metadata: {}
      };

      state.addAudit(entry);

      expect(state.audit.length).toBe(1);
      expect(state.audit[0]).toMatchObject(entry);
      expect(state.audit[0].id).toBeDefined();
      expect(state.audit[0].createdAt).toBeDefined();
    });

    it('should maintain a maximum of 500 audit entries', () => {
      for (let i = 0; i < 505; i++) {
        state.addAudit({
          actor: 'admin',
          event: `event_${i}`,
          resourceType: 'system',
          resourceId: 'sys_1',
          metadata: {}
        });
      }

      expect(state.audit.length).toBe(500);
      // The most recent entry (event_504) should be at index 0
      expect(state.audit[0].event).toBe('event_504');
    });
  });

  describe('addAlert', () => {
    it('should add an alert entry to the beginning of the array', () => {
      const alert = {
        severity: 'warning' as const,
        code: 'TEST_ALERT',
        message: 'This is a test alert'
      };

      state.addAlert(alert);

      expect(state.alerts.length).toBe(1);
      expect(state.alerts[0]).toMatchObject(alert);
      expect(state.alerts[0].id).toBeDefined();
      expect(state.alerts[0].createdAt).toBeDefined();
      expect(state.alerts[0].resolvedAt).toBeNull();
    });

    it('should maintain a maximum of 200 alert entries', () => {
      for (let i = 0; i < 205; i++) {
        state.addAlert({
          severity: 'info',
          code: `ALERT_${i}`,
          message: 'Test alert'
        });
      }

      expect(state.alerts.length).toBe(200);
      // The most recent alert should be at index 0
      expect(state.alerts[0].code).toBe('ALERT_204');
    });
  });

  describe('commandCounts', () => {
    beforeEach(() => {
      // Add some dummy commands
      const now = new Date().toISOString();
      const createCommand = (id: string, status: any) => ({
        id,
        type: 'session.mute_participant' as const,
        payload: { sessionId: '1' },
        requestedBy: 'admin',
        createdAt: now,
        expiresAt: now,
        status,
        executorId: null,
        result: null,
        error: null,
        auditMetadata: {}
      });

      state.commands.set('1', createCommand('1', 'pending'));
      state.commands.set('2', createCommand('2', 'pending'));
      state.commands.set('3', createCommand('3', 'running'));
      state.commands.set('4', createCommand('4', 'succeeded'));
      state.commands.set('5', createCommand('5', 'failed'));
    });

    it('should return total count when no status is provided', () => {
      expect(state.commandCounts()).toBe(5);
    });

    it('should return count for specific status', () => {
      expect(state.commandCounts('pending')).toBe(2);
      expect(state.commandCounts('running')).toBe(1);
      expect(state.commandCounts('succeeded')).toBe(1);
      expect(state.commandCounts('failed')).toBe(1);
      expect(state.commandCounts('cancelled')).toBe(0);
    });
  });
});
