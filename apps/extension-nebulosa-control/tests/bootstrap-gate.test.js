const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldBootstrapAutomation } = require('../content/bootstrap-gate');

test('does not bootstrap for in-meeting attendee readiness', () => {
  assert.equal(
    shouldBootstrapAutomation({
      meetingState: 'in_meeting_ready',
      hostCapable: false,
      automationArmed: false,
    }),
    false
  );
});

test('bootstraps only when automation is armed for host-ready state', () => {
  assert.equal(
    shouldBootstrapAutomation({
      meetingState: 'in_meeting_ready',
      hostCapable: true,
      automationArmed: true,
    }),
    true
  );
});
