const test = require('node:test');
const assert = require('node:assert/strict');

const { canInteractWithToggles, humanStatus } = require('../popup/status-helpers');

test('toggle interactivity is independent from automationArmed', () => {
  assert.equal(
    canInteractWithToggles({
      surface: 'wc_meeting',
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

test('human status distinguishes waiting room, joining, attendee, and unsupported layout', () => {
  assert.equal(
    humanStatus({ surface: 'wc_meeting', meetingState: 'joining_meeting', reason: 'waiting_room_detected' }),
    'In waiting room — waiting for host admission'
  );

  assert.equal(
    humanStatus({ surface: 'wc_join', meetingState: 'joining_meeting', reason: 'meeting_shell_not_loaded' }),
    'Joining meeting — waiting for Zoom UI'
  );

  assert.equal(
    humanStatus({
      surface: 'wc_meeting',
      meetingState: 'in_meeting_ready',
      hostCapable: false,
      automationArmed: false,
    }),
    'In meeting as attendee — host/cohost permissions not found'
  );

  assert.equal(
    humanStatus({ surface: 'wc_meeting', meetingState: 'in_meeting_unsupported_layout' }),
    'In meeting, but current Zoom layout is unsupported'
  );
});
