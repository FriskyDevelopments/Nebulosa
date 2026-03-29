const test = require('node:test');
const assert = require('node:assert/strict');

const { canInteractWithToggles, humanStatus } = require('../popup/status-helpers');

test('toggle interactivity is independent from automationArmed', () => {
  assert.equal(
    canInteractWithToggles({
      surface: 'zoom_web_client',
      meetingState: 'joining_meeting',
      automationArmed: false,
    }),
    true
  );

  assert.equal(
    canInteractWithToggles({
      surface: 'not_zoom',
      meetingState: 'not_zoom',
      automationArmed: false,
    }),
    false
  );
});

test('human status distinguishes waiting room, loading, attendee partial mode, and unsupported layout', () => {
  assert.equal(
    humanStatus({ surface: 'zoom_web_client', meetingState: 'joining_meeting', reason: 'waiting_room_detected' }),
    'In waiting room — waiting for host admission'
  );

  assert.equal(
    humanStatus({ surface: 'zoom_web_client', meetingState: 'loading', reason: 'meeting_shell_not_loaded' }),
    'Zoom Web Client loading…'
  );

  assert.equal(
    humanStatus({
      surface: 'zoom_web_client',
      meetingState: 'in_meeting_ready',
      hostCapable: false,
      automationArmed: false,
    }),
    'Zoom Web Client partial mode active (attendee)'
  );

  assert.equal(
    humanStatus({ surface: 'zoom_web_client', meetingState: 'in_meeting_unsupported_layout' }),
    'In meeting, but current Zoom layout is unsupported'
  );
});
